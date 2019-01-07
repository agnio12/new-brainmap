const dbInfo = require('../../../dbInfo.json');
const daumApi = require('../../config/daumApi.js');
const mysql = require('mysql');
const unirest = require('unirest');

const moment = require('moment');
moment.locale('ko');

const pool = mysql.createPool({
    connectionLimit: 100000,
    host: dbInfo.host,
    user: dbInfo.user,
    port: dbInfo.port,
    password: dbInfo.password,
    database: dbInfo.database,
    multipleStatements: true
});

/*+++++++++++++++++++++ENUM++++++++++++++++++++++++++*/
const panic = {
    PANIC_01: {DESC: "심계항진", SORT: 1, TEXT: "심장 두근거림"},
    PANIC_02: {DESC: "발한", SORT: 2, TEXT: "땀이 많이 남"},
    PANIC_03: {DESC: "오한", SORT: 3, TEXT: "몸이 떨리거나\n후들거림"},
    PANIC_04: {DESC: "숨가쁨", SORT: 4, TEXT: "숨가쁨\n답답한 느낌"},
    PANIC_05: {DESC: "질식", SORT: 5, TEXT: "질식 할 것 같은\n느낌"},
    PANIC_06: {DESC: "흉통", SORT: 6, TEXT: "흉통\n가슴 불편감"},
    PANIC_07: {DESC: "메스꺼움", SORT: 7, TEXT: "메스꺼움\n복부 불편감"},
    PANIC_08: {DESC: "어지러움", SORT: 8, TEXT: "불안정함\n멍한 느낌\n쓰러질 것 같음"},
    PANIC_09: {DESC: "춥고 열이남", SORT: 9, TEXT: "춥거나\n화끈거림"},
    PANIC_10: {DESC: "비현실감", SORT: 10, TEXT: "감각의 둔화\n따끔거리는 느낌"},
    PANIC_11: {DESC: "통제불능", SORT: 11, TEXT: "스스로 통제 불가\n미칠 것 같은 두려움"},
    PANIC_12: {DESC: "두려움", SORT: 12, TEXT: "죽을 것 같은 공포"},
}

const hyperactivity = {
    HYPER_01: {DESC: "활동을 조용하게 못해요", SORT: 1},
    HYPER_02: {DESC: "순서를 잘 지키지 못해요", SORT: 2},
    HYPER_03: {DESC: "손발을 가만히 두지 못하고 꼼지락거려요", SORT: 3},
    HYPER_04: {DESC: "자리에 오래 앉아 있지 못해요", SORT: 4}
}

const aggressions_title = {
    TITLE01: "어른, 부모에게 반항적 행동",
    TITLE02: "물리적 가해"
}

const aggression = {
    AGGR_01: {DESC: "간혹 욕설, 화, 논쟁하는 정도", TITLE: aggressions_title.TITLE01, SORT: 1},
    AGGR_02: {DESC: "물리적인 가해를 하는 경우", TITLE: aggressions_title.TITLE01, SORT: 2},
    AGGR_03: {DESC: "자주 싸우는 모습", TITLE: aggressions_title.TITLE02, SORT: 3},
    AGGR_04: {DESC: "무기를 사용하는 모습", TITLE: aggressions_title.TITLE02, SORT: 4},
    AGGR_05: {DESC: "공공시설을 파괴하는 모습", TITLE: aggressions_title.TITLE01, SORT: 5}
}

const drug_side_effects = {
    DRUG_01: {DESC: "일찍 잠을 자지 못해요", SORT: 1},
    DRUG_02: {DESC: "식욕이 너무 떨어져요", SORT: 2},
    DRUG_03: {DESC: "머리가 자주 아파요", SORT: 3},
    DRUG_04: {DESC: "배가 자주 아파요", SORT: 4}
}
/*+++++++++++++++++++++ENUM++++++++++++++++++++++++++*/
function enumsSort(a, b) {
    if (a.SORT == b.SORT) {
        return 0
    }
    return a.SORT > b.SORT ? 1 : -1;
}

module.exports =
    {
        daumApi: daumApi,
        moment: moment,
        unirest: unirest,
        pool: pool,
        panic: Object.values(panic).sort(enumsSort),
        hyperactivity: Object.values(hyperactivity).sort(enumsSort),
        aggression: Object.values(aggression).sort(enumsSort),
        drug_side_effects: Object.values(drug_side_effects).sort(enumsSort)
    }