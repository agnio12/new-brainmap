const mysql = require('mysql');
const dbInfo = require('../../../dbInfo.json');
const jwt = require('jsonwebtoken');
const secretKey = require("../../config/jwt");

const bcrypt = require('bcrypt-nodejs');
//const bodyParser = require('body-parser');
const moment = require('moment');
const utils = require('./appAPI.utils');

const nodemailer = require('nodemailer'); // 임시비밀번호 발송용

// TODO : adminMail은 실제 사용 가능한 이메일 계정이어야 함. 안 그러면 이메일 보낼 때 인증 실패함.
// TODO : contact@brainmap.com이 실제 사용한 이메일이 되기 전까지는 brainmap.email.test를 사용할 것.
// const adminMail = "contact@brainmap.com";
const adminMail = "brainmap.email.test";
const emailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: adminMail,
      pass: 'Psytune101'
  }
});

//bodyParser.use(bodyParser.urlencoded({extended:true}))
//bodyParser.use(bodyParser.json())
// 회원가입
exports.register = (req, res) => {
    const nextSerialNumQuery = "SELECT AUTO_INCREMENT FROM information_schema.tables WHERE table_name = 'patient' AND table_schema = DATABASE()";
    
    utils.pool.getConnection(function(err, connection) {
        connection.query(nextSerialNumQuery, function(err, rows) {
            
            const nextSerialNum = rows[0].AUTO_INCREMENT;
            const email = req.body.email;
            const password = bcrypt.hashSync(req.body.password); // 암호화
            const hospital = "99999"; // 일반회원가입은 무조건 99999
            // const hospital = (req.body.hospital == null || req.body.hospital == '' || req.body.hospital == typeof undefined) ? "99999" : req.body.hospital;
            // const hospital_auth = (req.body.hospital_auth == null || req.body.hospital_auth == '' || req.body.hospital_auth == typeof undefined) ? '' : req.body.hospital_auth; // 병원인증번호
            const name = req.body.name;
            const genderBit = req.body.gender;
            const gender = (genderBit % 2 == 1) ? 'M' : 'F'
            const birthdate = req.body.birthdate;
            // const historyNumber = (req.body.historyNumber == null || req.body.historyNumber == '' || req.body.historyNumber == typeof undefined) ? '' : req.body.historyNumber; // 병력번호
            
            const serialString = ("" + (1000000 + nextSerialNum)).substring(1);
            const id = hospital + genderBit + serialString
            
            // const sameHospitalAuthQuery = `SELECT id FROM patient WHERE  hospital=${hospital} AND hospital_auth='${hospital_auth}';`; 일단 인증번호 unique
            // const sameHospitalAuthQuery = `SELECT id FROM patient WHERE hospital_auth='${hospital_auth}';`;
            const sameEmailQuery = `SELECT email FROM patient WHERE  email = '${email}';`;
            connection.query(sameEmailQuery,  function(err, rows) {
                if(err) {
                    connection.release();
                    console.log(err);
                    res.json({isSuccess : false, message : "same patient lookup error"})
                    return;
                }
                if(rows.length > 0) {
                    connection.release();
                    res.json({isSuccess : false, message : "이미 가입된 이메일입니다."})
                    return;
                }
                
                let registerQuery = `SET @random_id = 
                                        (SELECT a.random_id FROM (SELECT UPPER(SUBSTRING(MD5(RAND()) FROM 1 FOR 5)) AS random_id) a 
                                        LEFT JOIN (SELECT moodchecker_id FROM patient) b ON a.random_id = b.moodchecker_id 
                                        LEFT JOIN (SELECT moodchecker_id FROM children) c ON a.random_id = c.moodchecker_id 
                                        WHERE b.moodchecker_id IS NULL AND c.moodchecker_id IS NULL 
                                        LIMIT 1);
                                     SET @hospital_auth = 
                                        (SELECT a.hospital_auth FROM (SELECT UPPER(SUBSTRING(MD5(RAND()) FROM 1 FOR 5)) AS hospital_auth) a 
                                        LEFT JOIN (SELECT hospital_auth FROM patient) b ON a.hospital_auth = b.hospital_auth 
                                        LEFT JOIN (SELECT hospital_auth FROM children) c ON a.hospital_auth = c.hospital_auth 
                                        WHERE b.hospital_auth IS NULL AND c.hospital_auth IS NULL 
                                        LIMIT 1);
                                     INSERT INTO patient (id, name, gender, birthdate, hospital, moodchecker_id, email, password, hospital_auth) VALUES 
                                     ( '${id}', HEX(AES_ENCRYPT('${name}', 'brain')), '${gender}', DATE_FORMAT('${birthdate}', '%Y-%m-%d'), 
                                       '${hospital}', (SELECT @random_id), '${email}', '${password}', (SELECT @hospital_auth) );`; 
         
                connection.query(registerQuery, function(err, rows) {
                    
                    if(err) {
                        console.log(err);
                        connection.release();
                        res.json({isSuccess : false, message : "patient info insertion error by app"});
                        return;
                    }
                    const selectQuery =
                         `SELECT id, CAST(AES_DECRYPT(UNHEX(name), 'brain') AS CHAR) AS name, gender, birthdate, history_number, hospital FROM patient WHERE id = ?;`
                   
                    connection.query(selectQuery, [id], function(err, rows) {
                        
                        if(err || rows.length == 0) {
                            connection.release();
                            res.json({isSuccess : false, message : "select recent patient error by app"});
                            return;
                        }else{
                            connection.release();
                            res.json({isSuccess : true, message : "success"});
                            return;
                        }
                    })
                })
            })    
        })
    })
}
// 인증회원 확인 (사용보류)
exports.hospitalAuthCheck = (req, res) => {
    
    const hospital_auth = (req.body.hospital_auth == null || req.body.hospital_auth == '' || req.body.hospital_auth == typeof undefined) ? '' : req.body.hospital_auth; // 병원인증번호
    
    const hospitalAuthCheckQuery = `SELECT h.name AS hospital_name, 
                                           p.history_number AS history_number, 
                                           DATE_FORMAT(p.birthdate, '%y%m%d') AS birthdate, 
                                           (CASE WHEN p.gender = 'M' THEN '1' ELSE '0' END) AS gender,
                                           CAST(AES_DECRYPT(UNHEX(p.name), 'brain') AS CHAR) AS name
                                      FROM patient p 
                                      JOIN hospital h ON p.hospital = h.id
                                     WHERE p.hospital_auth IS NOT NULL AND p.hospital_auth = ?`;
    
    utils.pool.getConnection(function(err, connection) {
        connection.query(hospitalAuthCheckQuery, [hospital_auth], function(err, rows) {
            if(err) {
                connection.release();
                console.log(err);
                res.json({isSuccess : false, message : "hospital auth check error"})
                return;
            }
            if(rows.length == 0) {
                connection.release();
                res.json({isSuccess : false, message : "인증번호를 다시 확인하세요"})
                return;
            }
            connection.release();
            res.json({isSuccess : true, message : "success", result: rows[0]});
            return;
        })
    })        
}
// 인증회원 회원가입 (사용보류)
exports.hospitalAuthRegister = (req, res) => {
            
    const hospital_auth = req.body.hospital_auth;
    const email = req.body.email;
    const password = bcrypt.hashSync(req.body.password); // 암호화
    const name = req.body.name;
    const genderBit = req.body.gender;
    const gender = (genderBit % 2 == 1) ? 'M' : 'F'
    const birthdate = req.body.birthdate;

    utils.pool.getConnection(function(err, connection) {
        
        const sameEmailQuery = `SELECT email FROM patient WHERE  email = ?;`;
        connection.query(sameEmailQuery, [email], function (err, rows) {
            if (err) {
                connection.release();
                console.log(err);
                res.json({ isSuccess: false, message: "hospital auth patient info insertion error by app" })
                return;
            }
            if (rows.length > 0) {
                connection.release();
                res.json({ isSuccess: false, message: "이미 가입된 이메일입니다." })
                return;
            }
            
            let registerQuery = `UPDATE patient SET email = '${email}', password = '${password}', name = HEX(AES_ENCRYPT('${name}', 'brain')), gender = '${gender}', birthdate = DATE_FORMAT('${birthdate}', '%Y-%m-%d') WHERE hospital_auth = ?`;

            connection.query(registerQuery, [hospital_auth], function (err, rows) {

                if (err) {
                    console.log(err);
                    connection.release();
                    res.json({ isSuccess: false, message: "hospital auth patient info insertion error by app" });
                    return;
                }
                const selectQuery =
                    `SELECT id, CAST(AES_DECRYPT(UNHEX(name), 'brain') AS CHAR) AS name, gender, birthdate, history_number, hospital FROM patient WHERE email = ?;`

                connection.query(selectQuery, [email], function (err, rows) {

                    if (err || rows.length == 0) {
                        connection.release();
                        console.log(err);
                        res.json({ isSuccess: false, message: "select recent patient error by app" });
                        return;
                    } else {
                        connection.release();
                        res.json({ isSuccess: true, message: "success" });
                        return;
                    }
                })
            })
        })
    })
}
// adhd 아이리스트
exports.childList = (req, res) => {
    const user_id = req.decoded.user_id;
    const childListQuery = 
         `SELECT c.moodchecker_id AS user_id, 
                 nickname AS nickname, 
                 DATE_FORMAT(c.birthdate, '%y%m%d') AS birthdate, 
                 (CASE WHEN c.gender = 'M' THEN '1' ELSE '0' END) AS gender, 
                 CAST(AES_DECRYPT(UNHEX(c.name), 'brain') AS CHAR) AS name, 
                 h.name AS hospital_name, 
                 c.hospital_auth AS hospital_auth, 
                 c.imageIdx AS imageIdx  
            FROM children c 
            LEFT JOIN patient p ON c.parent_id = p.id 
            LEFT JOIN hospital h ON c.hospital = h.id 
           WHERE p.moodchecker_id = ?
           ORDER BY c.serial_num;`;

    utils.pool.getConnection(function(err, connection) {
        connection.query(childListQuery, [user_id], function(err, rows) {
            if(err) {
                connection.release();
                console.log(err);
                res.json({isSuccess : false, message : "childList select error for app"})
                return;
            }
            if(rows.length == 0) {
                connection.release();
                res.json({isSuccess : false, message : "추가된 아이들이 없습니다"})
                return;
            }else{
                connection.release();
                res.json({ isSuccess: true, result : rows });
                return;
            }
        })
    })        
}
// 아이추가
exports.childRegister = (req, res) => {
    
    const user_id = req.decoded.user_id;
    const childNumberQuery = `SELECT COUNT(*) AS next_number, p.id AS parent_id 
                                FROM patient p JOIN children c ON p.id = c.parent_id
                               WHERE p.moodchecker_id = '${user_id}'`;
       
    utils.pool.getConnection(function(err, connection) {
        connection.query(childNumberQuery, function(err, rows) {
            
            const nextChildNumber = ((rows[0].next_number + 1)+"");
            const serialString = (rows[0].parent_id).substring(6);
            const parent_id = rows[0].parent_id;
            const name = (req.body.name == null || req.body.name == '' || req.body.name == typeof undefined) ? '' : req.body.name; // 이름
            const nickname = req.body.nickname;
            const genderBit = req.body.gender;
            const gender = (genderBit % 2 == 1) ? 'M' : 'F'
            const birthdate = req.body.birthdate;
            const hospital = "99999"; // 일반회원가입은 무조건 99999
            const imageIdx = req.body.imageIdx; // 아이추가 이미지번호
            
            const id = hospital + genderBit + serialString + nextChildNumber; // 아이 고유id체계 : 병원id + 성별 + 부모serial_num + 순서

            //const sameHospitalAuthQuery = `SELECT id FROM children WHERE hospital_auth = ?;`; // 병원인증번호 체크

            //connection.query(sameHospitalAuthQuery, [hospital_auth], function(err, rows) {

            let childRegisterQuery =
                `SET @random_id = 
                     (SELECT a.random_id FROM (SELECT UPPER(SUBSTRING(MD5(RAND()) FROM 1 FOR 5)) AS random_id) a
                     LEFT JOIN (SELECT moodchecker_id FROM patient) b ON a.random_id = b.moodchecker_id 
                     LEFT JOIN (SELECT moodchecker_id FROM children) c ON a.random_id = c.moodchecker_id 
                     WHERE b.moodchecker_id IS NULL and c.moodchecker_id IS NULL
                     LIMIT 1); 
                 SET @hospital_auth = 
                     (SELECT a.hospital_auth FROM (SELECT UPPER(SUBSTRING(MD5(RAND()) FROM 1 FOR 5)) AS hospital_auth) a 
                     LEFT JOIN (SELECT hospital_auth FROM patient) b ON a.hospital_auth = b.hospital_auth 
                     LEFT JOIN (SELECT hospital_auth FROM children) c ON a.hospital_auth = c.hospital_auth 
                     WHERE b.hospital_auth IS NULL AND c.hospital_auth IS NULL 
                     LIMIT 1);
                 INSERT INTO children (id, parent_id, moodchecker_id, name, nickname, gender, birthdate, hospital, hospital_auth, imageIdx) 
                 VALUES ( '${id}', '${parent_id}', (SELECT @random_id), HEX(AES_ENCRYPT('${name}', 'brain')), '${nickname}', '${gender}', 
                          DATE_FORMAT('${birthdate}', '%Y-%m-%d'), '${hospital}',(SELECT @hospital_auth), ${imageIdx} );`;

            connection.query(childRegisterQuery, function (err, rows) {

                if (err) {
                    console.log(err);
                    connection.release();
                    res.json({ isSuccess: false, message: "children info insertion error by app" });
                    return;
                }
                const selectQuery =
                    `SELECT id, CAST(AES_DECRYPT(UNHEX(name), 'brain') AS CHAR) AS name, gender, birthdate, history_number, hospital FROM children WHERE id = ?;`

                connection.query(selectQuery, [id], function (err, rows) {

                    if (err || rows.length == 0) {
                        connection.release();
                        console.log(err);
                        res.json({ isSuccess: false, message: "select children error by app" });
                        return;
                    } else {
                        connection.release();
                        res.json({ isSuccess: true, message: "success" });
                        return;
                    }
                })
            })
            //})
        })
    })        
}
// 아이수정
exports.childModify = (req, res) => {

    const p_user_id = req.decoded.user_id;
    const user_id = req.body.user_id;
    const name = (req.body.name == null || req.body.name == '' || req.body.name == typeof undefined) ? '' : req.body.name; // 이름
    const nickname = req.body.nickname;
    const genderBit = req.body.gender;
    const gender = (genderBit % 2 == 1) ? 'M' : 'F'
    const birthdate = req.body.birthdate;
    const imageIdx = req.body.imageIdx; // 아이추가 이미지번호
    
    const childModifyQuery = `UPDATE children c 
                                JOIN patient p ON c.parent_id = p.id 
                                 SET c.name = HEX(AES_ENCRYPT('${name}', 'brain')), 
                                     c.nickname = '${nickname}', c.gender = '${gender}', 
                                     c.birthdate = DATE_FORMAT('${birthdate}', '%Y-%m-%d'),
                                     c.imageIdx = ${imageIdx} 
                               WHERE p.moodchecker_id = '${p_user_id}' 
                                 AND c.moodchecker_id = '${user_id}'; `;
    
    utils.pool.getConnection(function(err, connection) {
        connection.query(childModifyQuery, function(err, rows) {
            
            if(err) {
                connection.release();
                console.log(err);
                res.json({isSuccess : false, message : "children modify error by app"})
                return;
            }
            const childSelectQuery = 
                 `SELECT c.moodchecker_id AS user_id, 
                         nickname AS nickname, 
                         DATE_FORMAT(c.birthdate, '%y%m%d') AS birthdate, 
                         (CASE WHEN c.gender = 'M' THEN '1' ELSE '0' END) AS gender, 
                         CAST(AES_DECRYPT(UNHEX(c.name), 'brain') AS CHAR) AS name, 
                         h.name AS hospital_name, 
                         c.hospital_auth AS hospital_auth, 
                         c.imageIdx AS imageIdx 
                    FROM children c 
                    LEFT JOIN hospital h ON c.hospital = h.id 
                   WHERE c.moodchecker_id = ?;`;
            connection.query(childSelectQuery, [user_id], function(err, rows) {       
                
                if (err) {
                    connection.release();
                    console.log(err);
                    res.json({ isSuccess: false, message: "select child error by app" });
                    return;
                } else if(rows.length == 0){
                    connection.release();
                    res.json({ isSuccess: false, message: "아이의 정보가 없습니다." });
                    return;
                }else{
                    connection.release();
                    res.json({ isSuccess: true, message: "success", result: rows[0] });
                    return;
                }
            })    
        })    
    })    
}
// 로그인
exports.login = (req, res) => {
    
    const email = req.body.email;
    const password = req.body.password;
    const query = `SELECT id, CAST(AES_DECRYPT(UNHEX(name), 'brain') AS CHAR) AS name,
                          moodchecker_id AS user_id, birthdate, email, password, visible 
                   FROM patient WHERE email ='${email}'`;
    
    utils.pool.getConnection(function(err, connection) {
        connection.query(query, function(err, rows) {
            connection.release();
            if(err){
                console.log("에러1 : " + err);
            }
            if (rows.length > 0) {

                if(rows[0].visible === 0){ // 탈퇴한 회원
                    return res.json({isSuccess : false, message : "탈퇴한 회원입니다."});
                }
                // DB password와 입력받은 평문을 비교
                bcrypt.compare(password, rows[0].password, function (err, resive) {

                    if (resive) { // 비번맞음 토큰생성

                        const p = new Promise((resolve, reject) => {
                            jwt.sign(
                                {
                                    email: rows[0].email,
                                    user_id :  rows[0].user_id,
                                    name: rows[0].name
                                },
                                secretKey.secret,
                                {
                                    expiresIn: '60m',
                                    issuer: 'buffer0',
                                    subject: 'userInfo'
                                }, (err, token) => {
                                    if (err) reject(err)
                                    resolve(token)
                                })
                        }).then(respond).catch(onError);
                        
                    } else {
                        return res.json({isSuccess : false, message : "비밀번호가 틀렸습니다."});
                    }
                });
            } else { // 가입되지않은 email
                return res.json({isSuccess : false, message : "존재하지 않는 이메일입니다."});
            }
            // respond the token 
            const respond = (token) => {
                res.cookie("user", token, {httpOnly : true}, {Secure : true}); // cookie 에 token 정보 저장
                res.json({
                    isSuccess : true,
                    user_id :  rows[0].user_id,
                    message : 'logged in successfully',
                    token
                })
            }
            // error occured
            const onError = (error) => {
                res.status(403).json({
                    message: error.message
                })
            }
        })
    })
}
// 로그아웃
exports.logout = (req, res) => {
    
    res.clearCookie("user");
    return res.json({isSuccess: true, message: "logout.."});
}
// 회원탈퇴 회원정보 삭제는 안함 patient table에서 visible 값만 바꿔줌
exports.delete_patient = (req, res) => {
    
    const user_id = req.decoded.user_id;
    const query = `UPDATE patient SET visible = 0, email = null where moodchecker_id = '${user_id}'`;

    utils.pool.getConnection(function(err, connection) {
        connection.query(query, function(err, rows) {
            connection.release();
             
            if(err){
                console.log("에러 : " + err);
                res.json({isSuccess: false, message: '환자 탈퇴 중 오류 발생.'});
                return;
            }
            res.clearCookie("user"); // 탈퇴시 토큰정보삭제
            res.json({isSuccess: true, message: "탈퇴되었습니다."});
        })
    })        
}
// 비밀번호 변경
exports.modifyPassword = (req, res) => {

    const email = req.decoded.email;
    const password = req.body.password; // 평문 password
    
    const getPasswordQuery = `SELECt password FROM patient WHERE email = ?;`;
    
    utils.pool.getConnection(function(err, connection) {
        connection.query(getPasswordQuery, [email], function(err, rows) {
             
            if(err){
                connection.release();
                console.log("에러 : " + err);
                res.json({isSuccess: false, message: '환자 탈퇴 중 오류 발생.'});
                return;
            }

            // DB password와 입력받은 평문을 비교
            bcrypt.compare(password, rows[0].password, function (err, resive) {

                if (resive) { // 비번맞음 

                    connection.release();
                    res.json({isSuccess : false, message : "이전 비밀번호와 동일합니다."});
                    return;
                    
                } else {
                    const hashPassword = bcrypt.hashSync(password); // 암호화

                    const updatePasswordQuery = `UPDATE patient SET password = '${hashPassword}' WHERE email = ?;`;

                    connection.query(updatePasswordQuery, [email], function(err, rows) {
                        connection.release();
                        if(err){
                            console.log("에러 : " + err);
                            res.json({isSuccess: false, message: '환자 탈퇴 중 오류 발생.'});
                            return;
                        }
                        res.json({isSuccess: true, message: "비밀번호가 변경되었습니다."});
                    })
                }
            })
        })
    })      
}
// 비밀번호 찾기
exports.findPassword = (req, res) => {

    const email = req.body.email;
    const genderBit = req.body.gender;
    const gender = (genderBit % 2 == 1) ? 'M' : 'F'
    const birthdate = req.body.birthdate;

    const tempPassword = getRamdomPassword(8); // 임시비밀번호 발생
    
    const findEmailQuery = `SELECT email FROM patient WHERE  email = ?;`; 

    utils.pool.getConnection(function(err, connection) {
        connection.query(findEmailQuery, [email], function(err, rows) {
             
            if(err){
                connection.release();
                console.log("에러 : " + err);
                res.json({isSuccess: false, message: '환자 탈퇴 중 오류 발생.'});
                return;
            }

            if (rows.length === 0) { 
                connection.release();
                res.json({isSuccess: false, message: '존재하지 않는 이메일입니다.'});
                return;
            }
            
            const checkUserQuery = `SELECT id FROM patient WHERE email = '${email}' AND gender = '${gender}' AND DATE_FORMAT(birthdate, '%y%m%d') = '${birthdate}';`;

            connection.query(checkUserQuery, function(err, rows) {

                if(err){
                    connection.release();
                    console.log("에러 : " + err);
                    res.json({isSuccess: false, message: '환자 탈퇴 중 오류 발생.'});
                    return;
                }

                if (rows.length === 0) { 
                    connection.release();
                    res.json({isSuccess: false, message: '부가정보를 확인하세요 가입시 입력한 성별과 생년월일 오류.'});
                    return;
                }

                const hashTempPassword = bcrypt.hashSync(tempPassword); // 임시비밀번호 암호화
                const updateTempPasswordQuery = `UPDATE patient SET password = '${hashTempPassword}' WHERE email = ?;`;

                connection.query(updateTempPasswordQuery, [email], function(err, rows) {
                    
                    connection.release();
                    
                    if(err){
                        console.log("에러 : " + err);
                        res.json({isSuccess: false, message: '환자 탈퇴 중 오류 발생.'});
                        return;
                    }

                    var mailOptions = {
                        from: adminMail,
                        to: email,
                        subject: "[BrainMap] 회원님의 임시비밀번호를 보내드립니다.",
                        html: sendEmailHtml({
                            email : email,
                            tempPassword : tempPassword
                        })
                    };
                    emailer.sendMail(mailOptions, function(error, info) {
                        if (error) {
                            console.log(error);
                            res.send({
                                isSuccess : false,
                                message : "메일 전송이 실패하였습니다. 다른 아이디로 다시 생성해주시기 바랍니다."
                            })
                            return;
                        }
                    });
                    
                    res.json({isSuccess: true, message: "임시비밀번호로 변경 완료."});    
                })
            })
        })
    })      
}
// 설정화면 사용자 정보 select
exports.selectUser = (req, res) => {
    const user_id = req.decoded.user_id;
    const selectQuery = `SELECT CAST(AES_DECRYPT(UNHEX(p.name), 'brain') AS CHAR) AS name, 
                                p.email AS email, 
                                h.id AS hospital_id,
                                h.name AS hospital_name
                          FROM patient p 
                          JOIN hospital h 
                            ON p.hospital = h.id
                         WHERE p.moodchecker_id = '${user_id}';`;
    utils.pool.getConnection(function (err, connection) {
        connection.query(selectQuery, function (err, rows) {
            
            connection.release();
            if(err){
                console.log(err);
                return res.json({ isSuccess: false, result: err });
            }
            if(rows.length > 0){
                return res.json({ isSuccess: true, result: rows[0] });
            }
        })
    })                               
}
// 병원 정보 select
exports.selectHospital = (req, res) => {
    const user_id = req.decoded.user_id;
    const selectQuery = `SELECT h.id AS hospital_id, 
                                h.name AS hospital_name,
                                h.admin_phone AS phone,
                                ha.road_address_name AS road_address_name,
                                ha.longitude AS longitude,
                                ha.latitude AS latitude,
                                h.homepage AS homepage,
                                h.blog AS blog,
                                h.hospital_info AS hospital_info 
                           FROM patient p 
                           JOIN hospital h ON p.hospital = h.id 
                           JOIN hospital_address ha ON p.hospital = ha.hospital_id
                          WHERE p.moodchecker_id = '${user_id}';`;
    utils.pool.getConnection(function (err, connection) {
        connection.query(selectQuery, function (err, rows) {
            
            connection.release();
            if(err){
                console.log(err);
                return res.json({ isSuccess: false, result: err });
            }
            if(rows.length > 0){
                return res.json({ isSuccess: true, result: rows[0] });
            }
        })
    })                               
}
// 병원연결
exports.connectHospital = (req, res) => {

    const user_id = req.body.user_id;
    const hospital_auth = req.body.hospital_auth;
/*
    const select_query = `SELECT id, hospital, moodchecker_id, hospital_auth, 'P' AS gubun 
                          FROM patient WHERE moodchecker_id = '${user_id}' AND hospital_auth = '${hospital_auth}'
                          UNION ALL
                          SELECT id, hospital, moodchecker_id, hospital_auth, 'C' AS gubun 
                          FROM children WHERE parent_id = (SELECT id FROM patient WHERE moodchecker_id = '${user_id}') and hospital_auth = '${hospital_auth}';`;
  */  

    const selectQuery = `SELECT hospital_auth, hospital, user_id FROM hospital_auth WHERE user_id = '${user_id}' AND hospital_auth = '${hospital_auth}';`;
    utils.pool.getConnection(function (err, connection) {
        connection.query(selectQuery, function (err, rows) {

            if (err) {
                connection.release();
                console.log(err);
                return res.json({ isSuccess: false, result: err });
            }

            if (rows.length > 0) {
                const hospital_id = rows[0].hospital;
                const select_query = `SELECT id, hospital, moodchecker_id, hospital_auth, 'P' AS gubun 
                                          FROM patient WHERE moodchecker_id = '${user_id}' AND hospital_auth = '${hospital_auth}'
                                          UNION ALL
                                          SELECT id, hospital, moodchecker_id, hospital_auth, 'C' AS gubun 
                                          FROM children WHERE moodchecker_id = '${user_id}' AND hospital_auth = '${hospital_auth}';`;

                utils.pool.getConnection(function (err, connection) {
                    connection.query(select_query, function (err, rows) {

                        if (err) {
                            connection.release();
                            console.log(err);
                            return res.json({ isSuccess: false, result: err });
                        }

                        if (rows.length > 0) {

                            let rows_data = {
                                user_id: rows[0].moodchecker_id,
                                id: rows[0].id,
                                hospital: rows[0].hospital
                            }

                            if (rows_data.hospital == hospital_id) {
                                connection.release();
                                return res.json({ isSuccess: false, message: "이미 같은 병원에 연결되어 있습니다." });
                            }
                            let update_query = "";
                            if (rows[0].gubun === 'P') {
                                update_query = "update patient set id = '{0}', hospital = '{1}' where moodchecker_id = '{2}';".format(hospital_id + rows_data.id.substring(rows_data.id.length - 7), hospital_id, user_id);
                            } else {
                                update_query = "update children set id = '{0}', hospital = '{1}' where moodchecker_id = '{2}';".format(hospital_id + rows_data.id.substring(rows_data.id.length - 8), hospital_id, user_id);
                            }

                            utils.pool.getConnection(function (err, connection) {
                                connection.query(update_query, function (err, rows) {
                                    if (err) {
                                        console.log(err);
                                        connection.release();
                                        return res.json({ isSuccess: false, result: err });
                                    }

                                    let insert_query = "insert into hospital_connect_log(user_id, before_hospital_id, after_hospital_id)";
                                    insert_query += "values ('{0}', '{1}', '{2}');".format(rows_data.user_id, rows_data.hospital, hospital_id);
                                    connection.query(insert_query, function (err, rows) {
                                        if (err) {
                                            console.log(err);
                                            connection.release();
                                            return res.json({ isSuccess: false, result: err });
                                        }
                                    });

                                    connection.release();
                                    return res.json({
                                        isSuccess: true,
                                        result: {
                                            message: "병원 연결이 완료 되었습니다."
                                        }
                                    });
                                });
                            });
                        } else {
                            connection.release();
                            return res.json({ isSuccess: false, message: "유효하지 않은 병원인증코드 입니다." });
                        }
                    });
                });

            } else {
                connection.release();
                return res.json({ isSuccess: false, message: "발급되지 않은 인증번호입니다." });
            }
        });
    });
}
// jwt토큰 검증
exports.check = (req, res) => {
    res.json({
        success: true,
        info: req.decoded
    })
}
// 임시비밀번호 난수생성
function getRamdomPassword(length){
    let charSet = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                   'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                   'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
                   'U', 'V', 'W', 'X', 'Y', 'Z'];
    let idx = 0;
    let tempPassword = "";
    for (var i = 0; i < length; i++) {
        idx = parseInt(charSet.length * Math.random());
        tempPassword += charSet[idx];
    }
    return tempPassword;               
}
// email send html
function sendEmailHtml(item) {
    if(isUndefined(item) || isUndefined(item.email) || isUndefined(item.tempPassword)) {
        console.log(item);
        return "";
    }

    var html = `<div style="margin:0;padding:0;table-layout:fixed;">
                    <div style="font-size:15px;">
                        <div>
                            <label style="text-align: center;">아이디 :</label>
                            <span style="margin-left:5px;"> ${item.email} </span>
                        </div>
                        <div>
                            <label style="text-align: center;">임시비밀번호 :</label>
                            <span style="margin-left:5px;"> ${item.tempPassword} </span>
                        </div>
                    </div>
                    <div style="margin:0;padding:0;table-layout:fixed;">
                        <ul style="list-style:none;">
                            <li>임시비밀번호로 로그인 후 비밀번호를 꼭 변경해 주세요.</li>
                        </ul>
                    </div>
                </div>`;
      return html;
}

function isUndefined($0) {
    return !$0 || typeof $0 == typeof undefined;
}