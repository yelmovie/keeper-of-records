/**
 * 역사 데이터 검증
 *  - claim id 중복 / 참조 무결성
 *  - 학생 화면에 노출되는 자료가 approved claim만 참조하는지
 *  - 인물·조직 참조 무결성
 *  - CASE 내부 참조 (evidence id, slot, timeline) 무결성
 *  - 금지 표현 사용 여부
 *
 * 역사적 사실의 진위는 자동 검증할 수 없다 → 사람이 최종 검수한다.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DATA = join(process.cwd(), 'public', 'data');
const errors = [];
const warnings = [];

const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const readJSON = async (p) => JSON.parse(await readFile(p, 'utf8'));

/** 독립운동가를 범죄 수사 대상으로 오해하게 만드는 표현 */
const FORBIDDEN = ['용의자', '범인', '심문', '검거', '혐의'];

function scanForbidden(label, value) {
  if (typeof value === 'string') {
    FORBIDDEN.forEach((w) => {
      if (value.includes(w)) err(`금지 표현 "${w}" 발견 → ${label}: ${value.slice(0, 60)}`);
    });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => scanForbidden(`${label}[${i}]`, v));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => scanForbidden(`${label}.${k}`, v));
  }
}

async function main() {
  const claims = await readJSON(join(DATA, 'historical-sources.json'));
  const people = await readJSON(join(DATA, 'people.json'));
  const orgs = await readJSON(join(DATA, 'organizations.json'));
  const catalog = await readJSON(join(DATA, 'catalog.json'));

  // ── claim ─────────────────────────────
  const claimMap = new Map();
  for (const c of claims) {
    if (claimMap.has(c.id)) err(`claim id 중복: ${c.id}`);
    claimMap.set(c.id, c);
    if (!c.claim) err(`claim 본문 없음: ${c.id}`);
    if (!c.sourceName) err(`sourceName 없음: ${c.id}`);
    if (!['official', 'academic', 'museum', 'archive'].includes(c.sourceType)) {
      err(`sourceType 값이 잘못됨: ${c.id} (${c.sourceType})`);
    }
    if (!['draft', 'reviewed', 'approved', 'rejected'].includes(c.status)) {
      err(`status 값이 잘못됨: ${c.id} (${c.status})`);
    }
    if (c.status === 'approved' && !c.sourceUrl) {
      err(`approved claim에 sourceUrl이 없음: ${c.id}`);
    }
    if (c.directQuote && !c.quoteText) {
      err(`directQuote=true 인데 quoteText 없음: ${c.id}`);
    }
    if (c.quoteText && !c.directQuote) {
      err(`quoteText가 있는데 directQuote=false: ${c.id}`);
    }
  }

  const approved = (id) => claimMap.get(id)?.status === 'approved';

  const checkClaimRefs = (label, ids, requireApproved = true) => {
    (ids ?? []).forEach((id) => {
      if (!claimMap.has(id)) {
        err(`존재하지 않는 claim 참조: ${label} → ${id}`);
        return;
      }
      if (requireApproved && !approved(id)) {
        err(
          `학생 화면에 노출되는 자료가 approved가 아닌 claim을 참조: ${label} → ${id} (${claimMap.get(id).status})`,
        );
      }
    });
  };

  // ── person ─────────────────────────────
  const personIds = new Set();
  for (const p of people) {
    if (personIds.has(p.id)) err(`person id 중복: ${p.id}`);
    personIds.add(p.id);
    checkClaimRefs(`people/${p.id}`, p.sourceClaimIds);
    scanForbidden(`people/${p.id}`, p);
  }

  // ── organization ─────────────────────────────
  const orgIds = new Set();
  for (const o of orgs) {
    if (orgIds.has(o.id)) err(`organization id 중복: ${o.id}`);
    orgIds.add(o.id);
    checkClaimRefs(`organizations/${o.id}`, o.sourceClaimIds);
    scanForbidden(`organizations/${o.id}`, o);
  }

  for (const p of people) {
    (p.organizationIds ?? []).forEach((oid) => {
      if (!orgIds.has(oid)) err(`people/${p.id} 가 없는 조직을 참조: ${oid}`);
    });
  }

  for (const c of claims) {
    (c.personIds ?? []).forEach((pid) => {
      if (!personIds.has(pid)) warn(`claim/${c.id} 가 people에 없는 인물을 참조: ${pid}`);
    });
    (c.organizationIds ?? []).forEach((oid) => {
      if (!orgIds.has(oid)) warn(`claim/${c.id} 가 organizations에 없는 조직을 참조: ${oid}`);
    });
  }

  // ── case (단일 파일 + 트랙 폴더 안 track-*.json 모두) ─────
  const caseDir = join(DATA, 'cases');
  const caseFiles = [];
  for (const entry of await readdir(caseDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      caseFiles.push(entry.name);
    } else if (entry.isDirectory()) {
      for (const f of await readdir(join(caseDir, entry.name))) {
        if (f.endsWith('.json')) caseFiles.push(join(entry.name, f));
      }
    }
  }
  const caseIds = new Set();

  for (const file of caseFiles) {
    const c = await readJSON(join(caseDir, file));
    caseIds.add(c.id);
    const L = `cases/${file.replace(/\\/g, '/')}`;
    scanForbidden(L, c);

    if (!personIds.has(c.solvedPersonId)) {
      err(`${L}: solvedPersonId 가 people에 없음 (${c.solvedPersonId})`);
    }
    c.candidateIds.forEach((pid) => {
      if (!personIds.has(pid)) err(`${L}: 후보 인물이 people에 없음 (${pid})`);
    });
    if (!c.candidateIds.includes(c.solvedPersonId)) {
      err(`${L}: solvedPersonId 가 후보 목록에 없음`);
    }
    c.finalCandidateIds.forEach((pid) => {
      if (!c.candidateIds.includes(pid)) {
        err(`${L}: 최종 후보가 후보 목록에 없음 (${pid})`);
      }
    });

    const evMap = new Map();
    for (const e of c.evidence) {
      if (evMap.has(e.id)) err(`${L}: evidence id 중복 (${e.id})`);
      evMap.set(e.id, e);
      checkClaimRefs(`${L}/evidence/${e.id}`, e.sourceClaimIds);
      if (!e.sourceClaimIds?.length) {
        err(`${L}/evidence/${e.id}: 출처 claim이 없음`);
      }
      e.relatedPersonIds.forEach((pid) => {
        if (!personIds.has(pid)) {
          err(`${L}/evidence/${e.id}: 없는 인물 참조 (${pid})`);
        }
      });
      if (!['context', 'shared', 'direct'].includes(e.strength)) {
        err(`${L}/evidence/${e.id}: strength 값이 잘못됨 (${e.strength})`);
      }
      // 한 단서 = 한 인물 구조 방지: direct가 아닌데 인물이 1명이면 경고
      if (e.strength === 'shared' && e.relatedPersonIds.length < 2) {
        err(`${L}/evidence/${e.id}: shared 인데 연결 인물이 2명 미만`);
      }
      if (e.strength === 'direct' && e.relatedPersonIds.length !== 1) {
        err(`${L}/evidence/${e.id}: direct 인데 연결 인물이 1명이 아님`);
      }
    }

    const ref = (id, where) => {
      if (!evMap.has(id)) err(`${L}/${where}: 없는 evidence 참조 (${id})`);
    };

    c.initialClueIds.forEach((id) => ref(id, 'initialClueIds'));

    // explore
    const ex = c.stages.explore;
    const hotIds = new Set();
    ex.hotspots.forEach((h) => {
      if (hotIds.has(h.id)) err(`${L}/explore: hotspot id 중복 (${h.id})`);
      hotIds.add(h.id);
      if (h.evidenceId) ref(h.evidenceId, `explore/${h.id}`);
      else if (!h.emptyText) {
        err(`${L}/explore/${h.id}: 단서가 아닌 물건에 emptyText가 없음`);
      }
      if (h.x < 0 || h.y < 0 || h.x + h.w > ex.roomWidth) {
        err(`${L}/explore/${h.id}: 좌표가 방 범위를 벗어남`);
      }
    });
    ex.requiredEvidenceIds.forEach((id) => {
      ref(id, 'explore/required');
      const reachable = ex.hotspots.some((h) => h.evidenceId === id);
      if (!reachable) {
        err(`${L}/explore: 필수 자료 ${id} 를 얻을 수 있는 물건이 없음`);
      }
    });
    // 조작 다양성: 서로 다른 interaction 3개 이상
    const kinds = new Set(ex.hotspots.map((h) => h.interaction));
    if (kinds.size < 3) {
      err(`${L}/explore: 서로 다른 조작이 ${kinds.size}종뿐입니다 (3종 이상 필요)`);
    }
    // 단서가 아닌 물건이 최소 1개 (랜덤 클릭 방지)
    if (!ex.hotspots.some((h) => !h.evidenceId)) {
      err(`${L}/explore: 단서가 아닌 물건이 하나도 없습니다`);
    }

    // analyze
    // 자료 분석에 도착했을 때 아이가 손에 쥐고 있을 수 있는 기록.
    // 여기 없는 기록을 겹쳐 보기·연표에 쓰면 읽어 보지 못한 자료로 판단하게 된다.
    const inHand = new Set([
      ...(c.initialClueIds ?? []),
      ...(c.stages.explore?.hotspots ?? [])
        .map((h) => h.evidenceId)
        .filter(Boolean),
      ...c.stages.analyze.tasks
        .map((t) => t.compareUnlockEvidenceId)
        .filter(Boolean),
    ]);
    c.stages.analyze.tasks.forEach((t) => {
      [...(t.pairEvidenceIds ?? []), ...(t.timelineEvidenceIds ?? [])].forEach(
        (id) => {
          if (!inHand.has(id)) {
            err(
              `${L}/analyze/${t.id}: ${id} 은(는) 자료 분석 전에 얻을 수 없는 기록입니다`,
            );
          }
        },
      );
    });

    const types = new Set(c.stages.analyze.tasks.map((t) => t.type));
    if (types.size < 2) {
      err(`${L}/analyze: 작업 유형이 ${types.size}종뿐입니다 (2종 이상 필요)`);
    }
    c.stages.analyze.tasks.forEach((t) => {
      (t.pairEvidenceIds ?? []).forEach((id) => ref(id, `analyze/${t.id}`));
      (t.timelineEvidenceIds ?? []).forEach((id) => ref(id, `analyze/${t.id}`));
      if (t.compareUnlockEvidenceId) ref(t.compareUnlockEvidenceId, `analyze/${t.id}`);
      if (t.timelineCorrectOrder) {
        const a = [...(t.timelineEvidenceIds ?? [])].sort().join(',');
        const b = [...t.timelineCorrectOrder].sort().join(',');
        if (a !== b) err(`${L}/analyze/${t.id}: timeline 정답 구성이 카드와 다릅니다`);
      }
      (t.connectNodes ?? []).forEach((n) => {
        (n.sourceEvidenceIds ?? []).forEach((id) =>
          ref(id, `analyze/${t.id}/${n.id}`),
        );
      });
      // 연표 카드에 적는 연도는 지어낼 수 없다.
      // 그 기록을 뒷받침하는 approved claim 의 dateText 안에 있어야 하고,
      // 정답 순서는 실제 연·월 순서와 같아야 한다.
      if (t.timelineCorrectOrder && t.timelineDateLabels) {
        const yearsIn = (s) => (String(s).match(/\d{4}/g) ?? []).map(Number);
        let prev = null;
        t.timelineCorrectOrder.forEach((id) => {
          const label = t.timelineDateLabels[id];
          if (!label) {
            err(`${L}/analyze/${t.id}: ${id} 에 연도 표시가 없습니다`);
            return;
          }
          const ev = evMap.get(id);
          const claimDates = (ev?.sourceClaimIds ?? [])
            .map((cid) => claimMap.get(cid))
            .filter((c) => c && c.status === 'approved')
            .flatMap((c) => yearsIn(c.dateText ?? ''));
          const labelYears = yearsIn(label);
          if (labelYears.length === 0) {
            err(`${L}/analyze/${t.id}/${id}: 연도 표시 "${label}" 에서 연도를 읽을 수 없습니다`);
          } else if (!labelYears.every((y) => claimDates.includes(y))) {
            err(
              `${L}/analyze/${t.id}/${id}: 연표에 적은 "${label}" 이(가) 승인된 출처의 연도(${claimDates.join(',') || '없음'})와 다릅니다`,
            );
          }
          const month = Number((label.match(/(\d{1,2})월/) ?? [, 0])[1]);
          const key = [labelYears[0] ?? 0, month];
          if (prev && (key[0] < prev[0] || (key[0] === prev[0] && key[1] < prev[1]))) {
            err(
              `${L}/analyze/${t.id}: 연표 정답 순서가 실제 연도 순서와 다릅니다 (${label} 이(가) 앞 카드보다 이릅니다)`,
            );
          }
          prev = key;
        });
      }
      if (t.connectAnswers) {
        const nodeIds = new Set((t.connectNodes ?? []).map((n) => n.id));
        t.connectAnswers.forEach(([a, b]) => {
          if (!nodeIds.has(a) || !nodeIds.has(b)) {
            err(`${L}/analyze/${t.id}: connect 정답이 없는 노드를 참조 (${a}, ${b})`);
          }
        });
        // 아이에게 "확보한 기록에 없는 이름은 이을 수 없다"고 가르치므로,
        // 근거 기록이 없는 노드가 정답 짝에 들어가 있으면 그 규칙이 깨진다.
        const linked = new Set(t.connectAnswers.flat());
        (t.connectNodes ?? []).forEach((n) => {
          if (linked.has(n.id) && (n.sourceEvidenceIds ?? []).length === 0) {
            err(
              `${L}/analyze/${t.id}/${n.id}: 정답 짝에 있는데 근거 기록(sourceEvidenceIds)이 없습니다`,
            );
          }
        });
        // 그런 노드가 하나도 없으면 위 규칙을 연습할 기회가 없다
        if (
          !(t.connectNodes ?? []).some(
            (n) => (n.sourceEvidenceIds ?? []).length === 0,
          )
        ) {
          err(
            `${L}/analyze/${t.id}: 근거 기록이 없는 카드가 하나도 없습니다 (이어지지 않는 카드가 있어야 합니다)`,
          );
        }
        // 초등 수준에서 풀 수 있으려면, 정답 짝은 한 기록 안에 두 이름이 함께 나와야 한다
        const srcOf = new Map(
          (t.connectNodes ?? []).map((n) => [n.id, n.sourceEvidenceIds ?? []]),
        );
        t.connectAnswers.forEach(([a, b]) => {
          const shared = (srcOf.get(a) ?? []).filter((id) =>
            (srcOf.get(b) ?? []).includes(id),
          );
          if (shared.length === 0) {
            err(
              `${L}/analyze/${t.id}: 정답 짝 (${a}, ${b})을 함께 담은 기록이 없습니다`,
            );
          }
        });
        // 연결되지 않는 짝이 있어야 랜덤 연결로 못 푼다
        const maxPairs = (nodeIds.size * (nodeIds.size - 1)) / 2;
        if (t.connectAnswers.length >= maxPairs) {
          err(`${L}/analyze/${t.id}: 모든 짝이 정답이면 관계 판단이 되지 않습니다`);
        }
      }
    });

    // inquiry
    const inq = c.stages.inquiry;
    if (inq.budget >= inq.questions.length) {
      err(`${L}/inquiry: 조사권(${inq.budget})이 질문 수(${inq.questions.length}) 이상이면 선택이 의미 없습니다`);
    }
    const qIds = new Set();
    inq.questions.forEach((q) => {
      if (qIds.has(q.id)) err(`${L}/inquiry: 질문 id 중복 (${q.id})`);
      qIds.add(q.id);
      q.unlockEvidenceIds.forEach((id) => ref(id, `inquiry/${q.id}`));
      if (!q.recordSentences?.some((s) => s.isKey)) {
        err(`${L}/inquiry/${q.id}: 핵심 문장(isKey)이 없습니다`);
      }
      if (!q.recordSentences?.some((s) => !s.isKey)) {
        warn(`${L}/inquiry/${q.id}: 모든 문장이 핵심이면 밑줄 판단이 무의미합니다`);
      }
    });
    // 질문마다 얻는 정보가 달라야 한다
    const unlockSets = inq.questions.map((q) => q.unlockEvidenceIds.join(','));
    if (new Set(unlockSets).size !== unlockSets.length) {
      err(`${L}/inquiry: 서로 다른 질문이 같은 자료만 열어 줍니다`);
    }

    // restore
    const rs = c.stages.restore;
    rs.timelineEvidenceIds.forEach((id) => ref(id, 'restore/timeline'));
    rs.timelineEvidenceIds.forEach((id) => {
      if (!rs.timelineDateLabels?.[id]?.trim()) {
        err(`${L}/restore: 시간 순서 카드의 연도 표시가 없음 (${id})`);
      }
    });
    Object.keys(rs.timelineDateLabels ?? {}).forEach((id) => {
      if (!rs.timelineEvidenceIds.includes(id)) {
        err(`${L}/restore: 사용하지 않는 시간 순서 연도 표시 (${id})`);
      }
    });
    const ra = [...rs.timelineEvidenceIds].sort().join(',');
    const rb = [...rs.timelineCorrectOrder].sort().join(',');
    if (ra !== rb) err(`${L}/restore: timeline 정답 구성이 카드와 다릅니다`);
    const slotNames = new Set();
    rs.slots.forEach((s) => {
      slotNames.add(s.slot);
      const correct = s.options.filter((o) => o.correct);
      if (correct.length !== 1) {
        err(`${L}/restore/${s.slot}: 정답이 정확히 1개가 아닙니다 (${correct.length})`);
      }
      s.options
        .filter((o) => !o.correct)
        .forEach((o) => {
          if (!o.feedback) {
            err(`${L}/restore/${s.slot}/${o.id}: 오답 안내 문구가 없습니다`);
          }
          if (o.feedback && /틀렸/.test(o.feedback)) {
            err(`${L}/restore/${s.slot}/${o.id}: "틀렸습니다" 형태의 피드백은 사용하지 않습니다`);
          }
        });
    });
    ['person', 'period', 'organization', 'activity', 'role'].forEach((s) => {
      if (!slotNames.has(s)) err(`${L}/restore: 필수 슬롯 누락 (${s})`);
    });
    if (rs.minEvidenceCount < 3) {
      err(`${L}/restore: minEvidenceCount 는 3 이상이어야 합니다 (현재 ${rs.minEvidenceCount})`);
    }
    // 정답 인물의 direct 근거가 충분한지
    const directForSolved = c.evidence.filter(
      (e) => e.strength === 'direct' && e.relatedPersonIds.includes(c.solvedPersonId),
    ).length;
    if (directForSolved < rs.minEvidenceCount) {
      err(
        `${L}: 정답 인물의 direct 근거가 ${directForSolved}개로 minEvidenceCount(${rs.minEvidenceCount})에 못 미칩니다`,
      );
    }

    // memory scene
    if (c.memoryScene) {
      ref(c.memoryScene.unlockEvidenceId, 'memoryScene');
      checkClaimRefs(`${L}/memoryScene`, c.memoryScene.sourceClaimIds);
    }

    // epilogue
    c.epilogue.profileFacts.forEach((f, i) => {
      checkClaimRefs(`${L}/epilogue[${i}] ${f.label}`, f.sourceClaimIds);
      if (!f.sourceClaimIds?.length) {
        err(`${L}/epilogue[${i}] ${f.label}: 출처 claim이 없습니다`);
      }
    });
  }

  // ── catalog ─────────────────────────────
  for (const entry of catalog) {
    const sourceCaseId = entry.sourceCaseId ?? entry.id;
    if (entry.status === 'available' && !caseIds.has(sourceCaseId)) {
      err(`catalog: 열람 가능한 사건인데 원본 case 파일이 없음 (${entry.id} → ${sourceCaseId})`);
    }
    // 다중 트랙 사건: tracks에 올린 인물마다 track 파일이 있어야 하고 solvedPersonId가 일치해야 한다
    if (Array.isArray(entry.tracks)) {
      for (const t of entry.tracks) {
        const trackPath = join(caseDir, sourceCaseId, `track-${t}.json`);
        try {
          const tc = await readJSON(trackPath);
          if (tc.solvedPersonId !== t) {
            err(`catalog/${entry.id}: track-${t}.json 의 solvedPersonId(${tc.solvedPersonId})가 트랙 이름과 다름`);
          }
        } catch {
          err(`catalog/${entry.id}: tracks에 있는 "${t}" 트랙 파일이 없음 (${sourceCaseId}/track-${t}.json)`);
        }
      }
    }
    scanForbidden(`catalog/${entry.id}`, entry);
  }

  // ── 결과 ─────────────────────────────
  const todo = claims.filter((c) => c.status !== 'approved');
  console.log(`역사 데이터 검증`);
  console.log(`  claim ${claims.length}개 (approved ${claims.length - todo.length})`);
  console.log(`  인물 ${people.length}명 · 조직 ${orgs.length}개 · 사건 ${caseIds.size}개`);

  if (todo.length) {
    console.log(`\nTODO_HISTORY_REVIEW (${todo.length}건, 학생 화면 노출 금지):`);
    todo.forEach((c) => console.log(`  - [${c.status}] ${c.id}: ${c.claim}`));
  }

  if (warnings.length) {
    console.log(`\n경고 ${warnings.length}건:`);
    warnings.forEach((w) => console.log(`  ! ${w}`));
  }

  if (errors.length) {
    console.error(`\n오류 ${errors.length}건:`);
    errors.forEach((e) => console.error(`  x ${e}`));
    process.exit(1);
  }

  console.log('\n통과: 데이터 참조와 노출 규칙에 문제가 없습니다.');
  console.log('주의: 역사적 사실의 진위는 자동 검증되지 않습니다. 사람이 최종 검수하세요.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
