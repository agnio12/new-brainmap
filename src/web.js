const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const static = require('serve-static');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const expressErrorHandler = require('express-error-handler');
const ejs = require('ejs');
const dbInfo = require('../dbInfo.json');
const fs = require('fs');

// app api 추가 2019.9.27 by buffer0
const appAPI = require('./appAPI.js');
app.use('/api', appAPI);

const moment = require('moment');
moment.locale('ko');

const twix = require('twix');

const mysql = require('mysql');

const pool = mysql.createPool({
    connectionLimit: 100000,
    host: dbInfo.host,
    user: dbInfo.user,
    port: dbInfo.port,
    password: dbInfo.password,
    database: dbInfo.database,
    multipleStatements: true
});

const nodemailer = require('nodemailer');
const adminMail = "danacancer.h@gmail.com";
const emailer = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: adminMail,
        pass: 'dana1004'
    }
});

console.log(dbInfo.host);

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.set('port', process.env.PORT || 4000);
app.use(express.static(__dirname));
app.use(cookieParser());
app.use(expressSession({
    secret: 'my key',
    resave: true,
    saveUninitialized: true
}));


//HTML 페이지를 템플릿 페이지로 사용
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');




//로그인 - get
app.get('/login', function (req, res) {
    if (req.cookies.didLogin == "true") {
        res.cookie("didLogin", "false")
    }

    // brainmap 전체 사용자 count (visible = 탈퇴여부)
    const countQuery = `SELECT COUNT(*) AS count
                          FROM patient p 
                          LEFT JOIN children c 
                            ON p.id = c.parent_id 
                         WHERE p.visible = 1;`;

    // 전날 무드체커 입력한 환자 count                         
    const yesterdayCountQuery = `SELECT COUNT(b.user_id) AS count FROM(
                                     SELECT a.user_id FROM (    
                                        SELECT user_id FROM mood WHERE created_time = date_format(DATE_ADD(date_format(NOW(),'%Y-%m-%d'), INTERVAL -1 DAY), '%Y-%m-%d %H:%i:%s')  
                                        UNION ALL
                                        SELECT user_id FROM mood WHERE created_time = date_format(DATE_ADD(date_format(NOW(),'%Y-%m-%d'), INTERVAL -1 DAY), '%Y-%m-%d %H:%i:%s')
                                        UNION ALL
                                        SELECT user_id FROM mood WHERE created_time = date_format(DATE_ADD(date_format(NOW(),'%Y-%m-%d'), INTERVAL -1 DAY), '%Y-%m-%d %H:%i:%s')  
                                     ) a GROUP BY a.user_id    
                                 ) b;`;

    pool.getConnection(function (err, connection) {
        connection.query(countQuery + yesterdayCountQuery, function (err, rows) {
            connection.release();
            if (err) {
                console.log(err);
                res.send({ isSuccess: false, message: '로그인 페이지 로딩 시 오류' });
                return;
            }
            res.render('login', { innerExpress: express, ejs: ejs, innerApp: app, allCount: rows[0][0], yesterdayCount: rows[1][0] });
        })
    })
})

//로그인 - post
app.post('/login', function (req, res) {
    var id = req.body["id"];
    var pw = req.body["pw"];
    var query =
        "SELECT u.id AS id, u.pw, u.name, u.hospital, u.user_group, p.permitted " +
        "FROM user AS u JOIN permission AS p " +
        "ON u.hospital = p.hospital AND u.user_group = p.user_group " +
        "WHERE u.id='" + id + "' AND u.pw='" + pw + "'";

    pool.getConnection(function (err, connection) {
        connection.query(query, function (err, rows) {
            connection.release();
            if (err) {
                console.log("에러2 : " + err);
                res.status(500).send("요청 실패 : " + err);
            }
            else if (typeof rows == typeof undefined || rows.length == 0) {
                res.send({ isSuccess: false, dest: "" });
            }
            else {
                var isHospitalAdmin = (rows[0].user_group == "ADMIN" || rows[0].user_group == "DOCTOR" || rows[0].user_group == "DEVELOP")
                // TODO : 꼭 세션 기반으로 바꾸기!!
                res.cookie("user_id", rows[0].id);
                res.cookie("user_name", rows[0].name);
                res.cookie("user_email", rows[0].email);
                res.cookie("user_hospital", rows[0].hospital);
                res.cookie("is_admin", rows[0].user_group == "ADMIN" || rows[0].user_group == "DEVELOP");
                res.cookie("is_hospital_admin", isHospitalAdmin);
                res.send({ isSuccess: true, dest: "/" });
            }
        })
    })
})

//로그아웃
app.get('/logout', function (req, res) {
    // TODO : 꼭 세션 기반으로 바꾸기!!
    res.clearCookie('user_id');
    res.clearCookie('user_name');
    res.clearCookie('user_hospital');
    res.clearCookie('is_admin');
    res.clearCookie('is_hospital_admin');
    res.clearCookie('didLogin');
    res.clearCookie('patient');
    res.redirect('/login');
})


//메인 화면
app.get('/', function (req, res) {
    if (req.cookies.didLogin != "true") {
        res.redirect('/login');
        return;
    }
    var patientCookie = req.cookies.patient;
    var patientId = "-1";
    if (patientCookie) {
        var patientData = JSON.parse(req.cookies.patient);
        patientId = patientData["id"];
    }

    var query = "SELECT * FROM results WHERE (scale='STAIX1' OR scale='STAIX2' OR scale='BDI' OR scale='ISI') AND patient_id='" + patientId + "' ORDER BY date DESC";

    pool.getConnection(function (err, connection) {
        connection.query(query, function (err, rows) {
            connection.release();
            var STAIX1 = { date: "", value: "" };
            var STAIX2 = { date: "", value: "" };
            var BDI = { date: "", value: "" };
            var ISI = { date: "", value: "" };
            for (var i in rows) {
                var item = rows[i];
                if (item.scale == 'STAIX1') {
                    STAIX1.date = moment(item.date).format('YYYY-MM-DD');
                    STAIX1.value = item.value;
                    break;
                }
            }
            for (var i in rows) {
                var item = rows[i];
                if (item.scale == 'STAIX2') {
                    STAIX2.date = moment(item.date).format('YYYY-MM-DD');
                    STAIX2.value = item.value;
                    break;
                }
            }
            for (var i in rows) {
                var item = rows[i];
                if (item.scale == 'BDI') {
                    BDI.date = moment(item.date).format('YYYY-MM-DD');
                    BDI.value = item.value;
                    break;
                }
            }
            for (var i in rows) {
                var item = rows[i];
                if (item.scale == 'ISI') {
                    ISI.date = moment(item.date).format('YYYY-MM-DD');
                    ISI.value = item.value;
                    break;
                }
            }
            var datas = { STAIX1: STAIX1, STAIX2: STAIX2, BDI: BDI, ISI: ISI };

            var query =
            `SELECT
                 c.result_id AS result_id,
                 c.scalename AS scaleName,
                 c.eng_scalename AS eng_scalename,
                 c.value AS value,
                 ( CASE c.rnum WHEN 1 THEN CONCAT(c.rnum, 'st')
                               WHEN 2 THEN CONCAT(c.rnum, 'nd')
                               WHEN 3 THEN CONCAT(c.rnum, 'rd')
                                      ELSE CONCAT(c.rnum, 'th') END) AS rnum,
                 c.scaleDate AS scaleDate
             FROM (
                 SELECT
                     a.id AS result_id,
                     a.scale AS scalename,
                     a.eng_scale AS eng_scalename,
                     (CASE @vScale WHEN a.scale THEN @rownum:=@rownum+1 ELSE @rownum:=1 END) AS rnum,
                     (@vScale:=a.scale) AS vScale,
                     a.value AS value,
                     a.date AS scaleDate
                 FROM (
                     SELECT r.id AS id,
                            r.scale AS scale,
                            s.english_abbr_name AS eng_scale,
                            r.value AS value,
                            r.date AS date
                    FROM patient AS p 
                    JOIN results AS r ON p.id = r.patient_id
                    JOIN scale AS s ON r.scale = s.code  
                    WHERE p.id='${patientId}'
                    ORDER BY r.scale, r.date
                 ) a, (SELECT @vScale:='', @rownum:=0) b
             ) c
             ORDER BY scaleDate DESC, result_id DESC;
             
             SELECT COUNT(*) AS cnt FROM(
                SELECT (@cnt1:=
                           (SELECT COUNT(*) AS cnt 
                              FROM answers 
                             WHERE patient_id = '${patientId}' 
                               AND scale = 'BDI' 
                               AND question_id = 'BDI1009' 
                               AND value = '3'
                               ORDER BY date DESC LIMIT 1
                           ) 
                       ) AS cnt1,
                       (@cnt2:=
                           (SELECT COUNT(*) AS cnt 
                              FROM answers 
                             WHERE patient_id = '${patientId}' 
                               AND scale = 'BDI' 
                               AND question_id = 'BDI1009' 
                               AND value = '2'
                               ORDER BY date DESC LIMIT 1
                           ) 
                       ) AS cnt2,
                       (@cnt3:=
                           (SELECT COUNT(date) AS cnt 
                              FROM answers 
                             WHERE patient_id = '${patientId}' 
                               AND scale = 'KDACL' 
                               AND question_id IN ('KDACL1010','KDACL1012','KDACL1019')
                             GROUP BY date
                             ORDER BY date DESC LIMIT 1
                           ) 
                       ) AS cnt3
             ) a
             WHERE a.cnt1 > 0
                OR (a.cnt2 > 0 and a.cnt3 >= 2)
                OR a.cnt3 = 3; 
                
            SELECT CASE WHEN a.bdi_val = '0' AND a.isi_val = '3' THEN 'case1' 
                  WHEN a.bdi_val = '0' AND a.isi_val = '4' THEN 'case2' 
                        WHEN a.bdi_val = '1' AND a.isi_val = '3' THEN 'case3' 
                        WHEN a.bdi_val = '1' AND a.isi_val = '4' THEN 'case4' 
                        WHEN a.bdi_val = '2' AND a.isi_val = '3' THEN 'case5' 
                        WHEN a.bdi_val = '2' AND a.isi_val = '4' THEN 'case6' 
                        WHEN a.bdi_val = '3' AND a.isi_val = '3' THEN 'case7' 
                        WHEN a.bdi_val = '3' AND a.isi_val = '4' THEN 'case8' ELSE 'not' END AS rtn 
            FROM ( 
                SELECT (SELECT value FROM answers WHERE patient_id = '${patientId}' AND scale = 'BDI' AND question_id = 'BDI1016' ORDER BY date DESC LIMIT 1) AS bdi_val, 
                   (SELECT value FROM answers where patient_id = '${patientId}' AND scale = 'ISI' AND question_id = 'ISI1004' ORDER BY date DESC LIMIT 1) AS isi_val 
            ) a;

            SELECT ifNull(
                (SELECT DATEDIFF(DATE_FORMAT(DATE_FORMAT(NOW(),'%Y-%m-%d'), '%Y-%m-%d %H:%i:%s'), r.date) AS cnt 
                 FROM patient p 
                 JOIN results r 
                   ON p.id = r.patient_id 
                WHERE p.id = '${patientId}' 
                ORDER BY r.date DESC LIMIT 1)
            , 0) AS cnt  
            UNION all
            SELECT ifNull(
                (SELECT DATEDIFF(DATE_FORMAT(DATE_FORMAT(NOW(),'%Y-%m-%d'), '%Y-%m-%d %H:%i:%s'), r.date) AS cnt 
                 FROM children c 
                 JOIN results r 
                   ON c.id = r.patient_id 
                WHERE c.id = '${patientId}' 
                ORDER BY r.date DESC LIMIT 1)
            , 0) AS cnt
            UNION ALL 
            SELECT COUNT(*) AS cnt FROM ( 
                SELECT moodchecker_id AS user_id FROM patient 
                WHERE hospital = '${req.cookies.user_hospital}' 
                UNION ALL 
                SELECT moodchecker_id AS user_id FROM children 
                WHERE hospital = '${req.cookies.user_hospital}' 
            ) a 
            UNION ALL 
            SELECT COUNT(DISTINCT a.user_id) AS cnt FROM ( 
                SELECT moodchecker_id AS user_id FROM patient 
                WHERE hospital = '${req.cookies.user_hospital}' 
                UNION ALL 
                SELECT moodchecker_id AS user_id FROM children 
                WHERE hospital = '${req.cookies.user_hospital}' 
            ) a 
            LEFT JOIN mood m ON a.user_id = m.user_id 
            LEFT JOIN anxiety ax ON a.user_id = ax.user_id 
            LEFT JOIN adhd ah ON a.user_id = ah.user_id 
            WHERE m.created_time = DATE_FORMAT(DATE_ADD(DATE_FORMAT(NOW(),'%Y-%m-%d'), INTERVAL -1 DAY), '%Y-%m-%d %H:%i:%s') OR
                 ax.created_time = DATE_FORMAT(DATE_ADD(DATE_FORMAT(NOW(),'%Y-%m-%d'), INTERVAL -1 DAY), '%Y-%m-%d %H:%i:%s') OR
                 ah.created_time = DATE_FORMAT(DATE_ADD(DATE_FORMAT(NOW(),'%Y-%m-%d'), INTERVAL -1 DAY), '%Y-%m-%d %H:%i:%s');

            SELECT 
                d.code, d.title_code, d.title_name, d.question_code, d.question_name, d.sort, d.\`default\`, ifnull(hd.custom_dsmv, 0) as hospital_used, ifnull(pd.is_checked, 0) as patient_is_checked
            FROM dsmv d
            LEFT OUTER JOIN hospital_dsmv hd ON d.code = hd.custom_dsmv 
            LEFT OUTER JOIN patient_dsmv pd ON d.code = pd.dsmv AND pd.patient_id = '${patientId}' AND pd.hospital_id = ${req.cookies.user_hospital};`;

            pool.getConnection(function (err, connection) {
                connection.query(query, function (err, rows) {
                    connection.release();
                    if (err) {
                        console.log(err);
                        res.status(500);
                        return;
                    }
                    rows[0].forEach(function (item, i, items) {
                        item.scaleDate = moment(item.scaleDate).format('YYYY-MM-DD');
                    })

                    res.render('index',
                        {
                            innerExpress: express,
                            ejs: ejs,
                            innerApp: app,
                            results: JSON.stringify(rows[0]),
                            cnt: rows[1],
                            rtn: rows[2],
                            topCnt: JSON.stringify(rows[3]),
                            dsmv: JSON.stringify(rows[4]),
                            datas: JSON.stringify(datas),
                            user: JSON.stringify(req.cookies.user),
                            isAdmin: req.cookies.is_admin,
                            isHospitalAdmin: req.cookies.is_hospital_admin,
                            moodchecker: (typeof req.query.moodchecker === "undefined" ? "Mood" : req.query.moodchecker)
                        });
                })
            })
        })
    })
})

//환자 등록
app.post('/register/patient', function (req, res, next) {
    var user_hospital = req.cookies.user_hospital;
    var nextSerialNumQuery = "SELECT AUTO_INCREMENT FROM information_schema.tables WHERE table_name = 'patient' AND table_schema = DATABASE()";

    pool.getConnection(function (err, connection) {
        connection.query(nextSerialNumQuery, function (err, rows) {

            var nextSerialNum = rows[0]["AUTO_INCREMENT"];
            var hospital = req.body["hospital"];
            var name = req.body["name"];
            var gender = req.body["gender"];
            var genderBit = (req.body["gender"] == 'M') ? 1 : 0;
            var birthdate = req.body["birthdate"];
            var historyNumber = req.body["historynumber"];
            var serialString = ("" + (1000000 + nextSerialNum)).substring(1);
            var id = hospital + genderBit + serialString
            if (user_hospital !== hospital) { // 병원 쿠키정보랑 다른 병원으로 등록시도시 등록안됨
                connection.release();
                console.log(err);
                res.send({ isSuccess: false, message: "other hospital number add error" })
                return;
            }
            var sameChartNumQuery = "SELECT id FROM patient WHERE  hospital=" + hospital + " AND history_number='" + historyNumber + "'";

            connection.query(sameChartNumQuery, function (err, rows) {
                if (err) {
                    connection.release();
                    console.log(err);
                    res.send({ isSuccess: false, message: "same patient lookup error" })
                    return;
                }
                if (rows.length > 0) {
                    connection.release();
                    res.send({ isSuccess: false, message: "이미 같은 차트번호의 환자가 존재함" })
                    return;
                }
                var registerQuery =
                    "SET @random_id = " +
                    "(SELECT a.random_id FROM (SELECT UPPER(SUBSTRING(MD5(RAND()) FROM 1 FOR 5)) AS random_id) a " +
                    "LEFT JOIN (SELECT moodchecker_id FROM patient) b ON a.random_id = b.moodchecker_id " +
                    "LEFT JOIN (SELECT moodchecker_id FROM children) c ON a.random_id = c.moodchecker_id " +
                    "WHERE b.moodchecker_id IS NULL AND c.moodchecker_id IS NULL " +
                    "LIMIT 1); " +
                    "INSERT INTO patient (id, name, gender, birthdate, history_number, hospital, moodchecker_id) values"
                    + "('" + id
                    + "', " + "HEX(AES_ENCRYPT('" + name + "', 'brain')) "
                    + ", '" + gender
                    + "', " + "date_format('" + birthdate + "', '%Y-%m-%d')"
                    + ", '" + historyNumber
                    + "', '" + hospital
                    + "', (SELECT @random_id)"
                    + ");"
                connection.query(registerQuery, function (err, rows) {
                    if (err) {
                        console.log(err);
                        connection.release();
                        res.send({ isSuccess: false, message: "patient info insertion error" })
                        return;
                    }
                    var selectQuery =
                        "SELECT id, CAST(AES_DECRYPT(UNHEX(name), 'brain') AS CHAR) AS name, "
                        + "gender, birthdate, history_number, hospital "
                        + "FROM patient WHERE id=" + id;
                    connection.query(selectQuery, function (err, rows) {
                        connection.release();
                        if (err || rows.length == 0) {
                            res.send({ isSuccess: false, message: "select recent patient error" })
                            return;
                        }
                        rows[0].birthdate = moment(rows[0].birthdate).format('YYYY-MM-DD');
                        res.send({ isSuccess: true, patient: JSON.stringify(rows[0]), message: "register success!" })
                    })
                })
            })
        })
    })
})

//Header - 환자 열람 (환자검색)
app.post('/search/patient', function (req, res, next) {
    var keyword = req.body["keyword"];
    var hospital = req.cookies.user_hospital;
    
    if (isUndefined(hospital)) {
        console.log("병원 정보 누락.");
        res.send({ isSuccess: false, result: "병원 정보 누락" });
        return;
    }

    var searchQuery =
        "SELECT id, CAST(AES_DECRYPT(UNHEX(name), 'brain') AS CHAR) AS name, "
        + "gender, birthdate, history_number, hospital, moodchecker_id FROM patient "
        + "WHERE (id='" + keyword + "' OR "
        + "name LIKE HEX(AES_ENCRYPT('" + keyword + "', 'brain')) OR "
        + "CAST(history_number AS CHAR) LIKE '" + keyword + "') "
        + "AND hospital=" + hospital;

    pool.getConnection(function (err, connection) {
        connection.query(searchQuery, function (err, rows) {
            connection.release();
            if (err) {
                console.log(err);
                res.send({ isSuccess: false, result: err })
            } else {
                rows.forEach(function (item, i, items) {
                    item.birthdate = moment(item.birthdate).format('YYYY-MM-DD');
                })
                res.send({ isSuccess: true, result: JSON.stringify(rows) })
            }
        })
    })
})

//DSM-V - GET
app.get('/patient/:patientId/dsmv', function (req, res) {
    var hospital = req.cookies.user_hospital;
    if (req.cookies.didLogin != "true" || isUndefined(hospital)) {
        res.send({ isSuccess: false, message: '로그인 안됨' });
        return;
    }
    var patientId = req.params.patientId;
    if (isUndefined(patientId)) {
        res.send({ isSuccess: false, message: "필수 항목 누락" });
        return;
    }

    let query = `
        SELECT 
            d.code, d.title_code, d.title_name, d.question_code, d.question_name, d.sort, ifnull(pd.is_checked, 0) AS is_checked
        FROM dsmv d
        LEFT OUTER JOIN patient_dsmv pd ON d.code = pd.dsmv AND pd.patient_id = '${patientId}' AND pd.hospital_id = ${hospital}
    `;

    pool.getConnection(function (err, connection) {
        connection.query(query, function (err, rows) {
            connection.release();
            if (err) {
                console.log(err);
                res.send({ isSuccess: false, message: "DSM-V 정보 읽는 중 에러 발생" });
                return;
            }
            rows.forEach(function (item, i, items) {
                item.created_time = moment(item.created_time).format('YYYY-MM-DD');
            })
            res.send({ isSuccess: true, results: rows });
        });
    });
});

//DSM-V - POST
app.post('/patient/:patientId/dsmv', function (req, res) {
    let hospital = req.cookies.user_hospital;
    if (req.cookies.didLogin != "true" || isUndefined(hospital)) {
        res.send({ isSuccess: false, message: '로그인 안됨' });
        return;
    }
    let patientId = req.params.patientId;
    let dsmv = JSON.parse(req.body.dsmv);
    let select_query = `SELECT COUNT(*) AS count FROM patient_dsmv WHERE hospital_id = '${hospital}' AND patient_id = '${patientId}';`;

    pool.getConnection(function (err, connection) {
        connection.query(select_query, function (err, rows) {
            connection.release();
            if (err) {
                console.log(err);
                res.send({ isSuccess: false, message: "DSM-V 입력 중 에러 발생" });
                return;
            }

            let inner_query = "";
            if(rows[0].count > 0) {
                inner_query += `DELETE FROM patient_dsmv WHERE hospital_id = ${hospital} AND patient_id = '${patientId}';`;
            }
            inner_query += `INSERT INTO patient_dsmv(patient_id, dsmv, is_checked, hospital_id) VALUES`;
            dsmv.forEach(value => {
                inner_query += `('${patientId}', '${value.code}', ${value.patient_is_checked}, ${hospital}),`;
            });
            inner_query = inner_query.replace(/(\,+$)/g, ";");

            pool.getConnection(function (err, connection) {
                connection.query(inner_query, function (err, rows) {
                    connection.release();
                    if (err) {
                        console.log(err);
                        res.send({ isSuccess: false, message: "DSM-V 입력 중 에러 발생" });
                        return;
                    }
                    res.send({ isSuccess: true, message: "DSM-V 입력 완료" });
                });
            });
        });
    });
});

//교육자료 select
app.get('/education', function (req, res) {
    if (req.cookies.didLogin != "true") {
        res.send({ isSuccess: false, message: '로그인 안됨' });
        return;
    }
    var query = "SELECT * FROM education"
    pool.getConnection(function (err, connection) {
        connection.query(query, function (err, rows) {
            connection.release();
            if (err) {
                console.log(err);
                res.send({ isSuccess: false, message: "교육자료 받는 중 에러 발생" });
                return;
            }
            rows.forEach(function (item, i, items) {
                item.created_time = moment(item.created_time).format('YY-MM-DD');
            })
            res.send({ isSuccess: true, results: rows });
        });
    });
});

//index DATA Graph
app.get('/patient/result', function (req, res) {
    var user_hospital = req.cookies.user_hospital;
    if (req.cookies.didLogin != "true" || isUndefined(user_hospital)) {
        res.send({ isSuccess: false, message: '로그인 되어있지 않습니다.' });
        return;
    }
    var patientId = req.query.patientId;
    var scale = req.query.scale;
    
    if (isUndefined(patientId)) {
        res.send({ isSuccess: false, message: '유효하지 않은 환자입니다.' });
        return;
    }
    if (isUndefined(scale)) {
        res.send({ isSuccess: false, message: '유효하지 않은 스케일입니다.' });
        return;
    }
    var query =
        "SELECT r.id, r.date, r.value, r.scale, r.patient_id " +
        "FROM results AS r JOIN patient AS p " +
        "ON r.patient_id = p.id " +
        "WHERE r.patient_id = '" + patientId + "'" +
        " AND r.scale = '" + scale + "'" +
        " AND p.hospital = '" + user_hospital + "' ORDER BY r.date asc";

    pool.getConnection(function (err, connection) {
        connection.query(query, function (err, rows) {
            connection.release();
            if (err) {
                console.log(err);
                res.send({ isSuccess: false, message: '결과를 받아오는 중 오류 발생.' });
                return;
            }
            if (rows.length == 0) {
                res.send({ isSuccess: false, message: '결과가 없거나 접근 권한이 없습니다.' });
                return;
            }
            rows.forEach(function (item, i, items) {
                item.date = moment(item.date).format('YYYY-MM-DD');
            })
            res.send({
                isSuccess: true,
                result: rows
            });
        })
    })
});



//Mood 정보 - index
app.get('/moodchecker/user/:userId/mood', function (req, res) {
    var userId = req.params.userId;
    if (isUndefined(userId)) {
        res.status(500).send({ isSuccess: false, message: "사용자 아이디 정보가 없음" })
        return;
    }

    var query = `SELECT * FROM mood WHERE user_id='${userId}' ORDER BY created_time DESC LIMIT 10`;
    pool.getConnection(function (err, connection) {
        connection.query(query, function (err, rows) {
            connection.release();
            if (err) {
                console.log(err);
                res.status(500).send({
                    isSuccess: false,
                    message: "무드 검색 중 오류"
                })
                return;
            }
            rows.forEach(function (item, i, items) {
                item.created_time = moment(item.created_time).format('YYYY-MM-DD');
                item.period = (item.period == 1)
                item.suicide = (item.suicide == 1)
            })
            res.send({
                isSuccess: true,
                message: "무드 검색 완료",
                result: rows
            })
        })
    })
});


//Mood Detail
app.get('/moodDetail', function (req, res) {
    if (req.cookies.didLogin != "true") {
        res.send({ isSuccess: false, message: '로그인이 필요한 서비스입니다.' });
        return;
    }
    res.render('moodDetail', 
        {
            innerExpress: express,
            ejs: ejs,
            innerApp: app,
            moodchecker: (typeof req.query.moodchecker === "undefined" ? "Mood" : req.query.moodchecker)
    });
});

//Sleep Detail
app.get('/sleepDetail', function (req, res) {
    if (req.cookies.didLogin != "true") {
        res.send({ isSuccess: false, message: '로그인이 필요한 서비스입니다.' });
        return;
    }
    res.render('sleepDetail', 
        {
            innerExpress: express,
            ejs: ejs,
            innerApp: app,
            moodchecker: (typeof req.query.moodchecker === "undefined" ? "Mood" : req.query.moodchecker)
    });
});


//Mood Detail - Mood & Sleep (기분정보)
app.get('/moodchecker/user/:userId/:moodchecker/:date', function (req, res) {
    var userId = req.params.userId;
    var item = (typeof req.params.moodchecker === "undefined" ? "Mood" : req.params.moodchecker).toLowerCase();
    var date = req.params.date;

    if (isUndefined(userId)) {
        res.status(500).send({ isSuccess: false, message: "사용자 아이디 정보가 없음" })
        return;
    }
    if (isUndefined(date)) {
        res.status(500).sen({ isSuccess: false, message: "날짜를 선택해주세요." });
        return;
    }
    if (item === "cognition") {
        return res.send({
            isSuccess: true,
            message: "Cognition는 개발중 입니다.",
            result: ""
        });
    }

    date = new Date(req.params.date);
    var firstDate = moment(new Date(date.getFullYear(), date.getMonth(), 1)).format('YYYY-MM-DD');
    var lastDate = moment(new Date(date.getFullYear(), date.getMonth() + 1, 0)).format('YYYY-MM-DD');

    var query = `SELECT * FROM ${item} WHERE user_id='${userId}' AND created_time between '${firstDate}' AND '${lastDate}' ORDER BY created_time DESC`;

    pool.getConnection(function (err, connection) {
        connection.query(query, function (err, rows) {
            connection.release();
            if (err) {
                console.log(err);
                res.status(500).send({
                    isSuccess: false,
                    message: "검색 중 오류"
                })
                return;
            }

            rows.forEach(function (element, i, items) {
                element.created_time = moment(element.created_time).format('YYYY-MM-DD');
                element.period = (element.period == 1)
                element.suicide = (element.suicide == 1)
                element.medicine = (element.medicine == 1)
            })

            if (rows.length > 0) {
                var startDate = firstDate;
                var endDate = lastDate;
                var dates = moment(startDate).twix(endDate).toArray('days').map(function (item) {
                    return item.format("YYYY-MM-DD");
                });
                // dates = dates.slice(1).slice(-14);
                let results = dates.map(function (item) {
                    var result = rows.filter(function (row) {
                        return moment(row.created_time).format("YYYY-MM-DD") == item
                    })
                    var emptyResult = {
                        user_id: userId,
                        id: -1,
                        created_time: item,
                        mood: 0,
                        sleep_time: "0",
                        period: false,
                        suicide: false,
                        medicine: false,
                        comment: ""
                    }
                    return (result.length > 0) ? result[0] : emptyResult;
                });
                res.send({
                    isSuccess: true,
                    message: "검색 완료",
                    result: results.slice().reverse()
                })
                return;
            }
            res.send({
                isSuccess: true,
                message: "검색 완료",
                result: rows.slice().reverse()
            })
        })
    })
});


//isUndefined 함수
function isUndefined($0) {
    return !$0 || typeof $0 == typeof undefined;
}

//404 에러 페이지 처리
var errorHandler = expressErrorHandler({
    static: {
        '404': './views/404.html'
    }
});
app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);

//express로 웹서버 생성
app.listen(app.get('port'), function () {
    console.log('Express started on http://localhost:' +
        app.get('port') + '; press Ctrl-C to terminate.');
});
