const express = require('express');
const api = express.Router();
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

api.use(cookieParser());
api.use(morgan('combined'));
api.use(bodyParser.urlencoded({extended:true}));
api.use(bodyParser.json());
//api.use(express.static('public')); // 정적파일 나타내기 banner

const authMiddleware = require("./middlewares/authCheck.js");  // jwt token 유효성체크 미들웨어
const auth = require('./routes/api/auth.js'); // 회원 컨트롤러
const controller = require('./routes/api/controller.js'); // 비지니스로직 
const banner = require('./routes/api/banner.js'); // banner
const addressApi = require('./routes/api/address.js');

/************************ token check middleware ************************/
api.use('/auth/childList', authMiddleware);
api.use('/auth/childRegister', authMiddleware);
api.use('/auth/childModify', authMiddleware);
api.use('/auth/logout', authMiddleware);
api.use('/auth/delete_patient', authMiddleware);
// api.use('/auth/findPassword', authMiddleware);
api.use('/auth/selectUser', authMiddleware);
api.use('/auth/selectHospital', authMiddleware);
api.use('/auth/modifyPassword', authMiddleware);
api.use('/auth/connectHospital', authMiddleware);
api.use('/mood/update', authMiddleware);
api.use('/anxiety/update', authMiddleware);
api.use('/adhd/update', authMiddleware);
api.use('/mood/:id/:date', authMiddleware);
api.use('/anxiety/:id/:date', authMiddleware);
api.use('/adhd/:id/:date', authMiddleware);
api.use('/moodMonth/:id/:date', authMiddleware);
api.use('/anxietyMonth/:id/:date', authMiddleware);
api.use('/adhdMonth/:id/:date', authMiddleware);
api.use('/hospitalAuth/:hospital_auth', authMiddleware);
api.use('/insertNotification', authMiddleware);
//api.use('/addressKeyword/:id/:query', authMiddleware);
/************************ token check middleware ************************/

api.use('/auth/check', authMiddleware);
api.get('/auth/check', auth.check); // jwt token 유효성체크 미들웨어 내 함수

api.post('/auth/register', auth.register); // 회원가입
api.post('/auth/hospitalAuthCheck', auth.hospitalAuthCheck); // 인증회원 인증번호 체크
api.post('/auth/hospitalAuthRegister', auth.hospitalAuthRegister); // 인증회원 회원가입

api.post('/auth/login', auth.login); // 회원로그인
api.post('/auth/logout', auth.logout); // 회원로그아웃
api.post('/auth/delete_patient', auth.delete_patient); // 회원탈퇴
api.post('/auth/childList', auth.childList); // 아이리스트
api.post('/auth/childRegister', auth.childRegister); // 아이추가
api.post('/auth/childModify', auth.childModify); // 아이수정

api.post('/auth/selectUser', auth.selectUser); // 설정화면 사용자 정보 select
api.post('/auth/selectHospital', auth.selectHospital); // 병원정보 select

api.post('/auth/findPassword', auth.findPassword); // 비밀번호 찾기
api.post('/auth/modifyPassword', auth.modifyPassword); // 비밀번호 변경



// (기분 select)
api.get('/mood/:id/:date', controller.moodSelect);
// (기분 update)
api.post('/mood/update', controller.moodUpdate);

// (불안 select)
api.get('/anxiety/:id/:date', controller.anxietySelect);
// (불안 update)
api.post('/anxiety/update', controller.anxietyUpdate);

// (ADHD select)
api.get('/adhd/:id/:date', controller.adhdSelect);
// (ADHD update)
api.post('/adhd/update', controller.adhdUpdate);

// 날짜순 보기(월별 조회)
api.get('/moodMonth/:id/:date', controller.moodMonthDate);
api.get('/anxietyMonth/:id/:date', controller.anxietyMonthDate);
api.get('/adhdMonth/:id/:date', controller.adhdMonthDate);

// 명칭으로 주소검색
api.post('/addressKeyword', controller.findAddressKeyword);
api.post('/findXYCoordinate', controller.findXYCoordinate);
api.get('/hospitalAuth/:hospital_auth', controller.hospitalAuth);
//병원/보건소 검색 연락처 저장
api.post('/insertNotification', controller.insertNotification);
// 병원연결
api.post('/auth/connectHospital', auth.connectHospital);
// main img 경로 (사이드바)
api.get('/mainImg', banner.getMainImg);
// 배너 경로
api.get('/banner', banner.getBanner);

module.exports = api;
