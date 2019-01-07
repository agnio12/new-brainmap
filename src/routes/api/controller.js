const utils = require('./appAPI.utils');

String.prototype.format = function () {
    let params = this;
    for (k in arguments) {
        params = params.replace("{" + k + "}", arguments[k])
    }
    return params
}

function isUndefined($0) {
    return !$0 || typeof $0 == typeof undefined;
}

module.exports = {
    moodSelect: function (req, res) {
        let id = req.params.id;
        let date = req.params.date;

        if (isUndefined(id)) {
            res.status(500).json({isSuccess: false, message: "사용자 아이디 정보가 없음"})
            return;
        }

        if (isUndefined(date)) {
            res.status(500).json({isSuccess: false, message: "날짜 정보가 없음"})
            return;
        }

        let query = "select m.user_id, m.mood, m.sleep_time, m.suicide, m.period, m.comment from mood m where m.user_id = '{0}' and DATE(created_time) = '{1}'".format(id, date);
        utils.pool.getConnection(function (err, connection) {
            connection.query(query, function (err, rows) {
                connection.release();
                if (err) {
                    console.log(err);
                    return res.json({isSuccess: false, result: err});
                }
                return res.json({isSuccess: true, result: rows[0]});
            });
        });
    },
    moodUpdate: function (req, res) {
        let id = req.body.user_id;
        let created_time = req.body.created_time;

        let mood = req.body.mood;
        let suicide = req.body.suicide;
        let period = req.body.period;
        let sleep_time = req.body.sleep_time;
        let comment = req.body.comment;

        if (isUndefined(id) || isUndefined(created_time)) {
            res.json({isSuccess: false, message: '누락된 정보가 있습니다.'});
            return;
        }

        let query = "select * from mood where user_id='{0}' and DATE(created_time) = '{1}' limit 1".format(id, created_time);
        utils.pool.getConnection(function (err, connection) {
            connection.query(query, function (err, rows) {
                connection.release();
                if (err) {
                    console.log(err);
                    return false;
                }

                if (rows.length > 0) {
                    query = "update mood set mood = '{0}', suicide = '{1}', period = '{2}', sleep_time = '{3}', comment = '{4}' ".format(mood, suicide, period, sleep_time, comment);
                    query += "where user_id='{0}' and created_time = '{1}'".format(id, created_time);
                    utils.pool.getConnection(function (err, connection) {
                        connection.query(query, function (err, rows) {
                            connection.release();
                            if (err) {
                                console.log(err);
                                return res.json({isSuccess: false, result: err});
                            }
                            return res.json({isSuccess: true});
                        });
                    });
                } else {
                    query = "INSERT INTO mood(user_id, created_time, mood, suicide, period, sleep_time, comment) VALUES('{0}', '{1}', '{2}', '{3}', '{4}', '{5}', '{6}') ".format(id, created_time, mood, suicide, period, sleep_time, comment);
                    utils.pool.getConnection(function (err, connection) {
                        connection.query(query, function (err, rows) {
                            connection.release();
                            if (err) {
                                console.log(err);
                                return res.json({isSuccess: false, result: err});
                            }
                            return res.json({isSuccess: true});
                        });
                    });
                }
            });
        });
    },
    anxietySelect: function (req, res) {
        let id = req.params.id;
        let date = req.params.date;

        if (isUndefined(id)) {
            res.status(500).send({isSuccess: false, message: "사용자 아이디 정보가 없음"})
            return;
        }

        if (isUndefined(date)) {
            res.status(500).send({isSuccess: false, message: "날짜 정보가 없음"})
            return;
        }

        let query = "select an.anxiety, an.sleep_time, an.panic, an.medicine, an.comment from anxiety an where user_id = '{0}' and date(created_time) = '{1}'".format(id, date);
        utils.pool.getConnection(function (err, connection) {
            connection.query(query, function (err, rows) {
                connection.release();
                if (err) {
                    console.log(err);
                    return res.json({isSuccess: false, result: err});
                }

                let rows_toJSON;
                if (rows[0] != null) {
                    rows_toJSON = {
                        anxiety: rows[0].anxiety,
                        sleep_time: rows[0].sleep_time,
                        panic: JSON.parse(rows[0].panic),
                        medicine: rows[0].medicine,
                        comment: rows[0].comment,
                        panicCount: Object.values(JSON.parse(rows[0].panic)).filter(x => x > 0).reduce((a,b) => a+b, 0)
                    };
                }

                return res.json({isSuccess: true, result: rows_toJSON, panic: utils.panic});
            });
        });
    },
    anxietyUpdate: function (req, res) {
        let id = req.body.user_id;
        let created_time = req.body.created_time;

        let anxiety = req.body.anxiety;
        let panic = req.body.panic;
        let medicine = req.body.medicine;
        let sleep_time = req.body.sleep_time;
        let comment = req.body.comment;

        if (isUndefined(id) || isUndefined(created_time)) {
            res.send({isSuccess: false, message: '누락된 정보가 있습니다.'});
        }

        let query = "select * from anxiety where user_id='{0}' and DATE(created_time) = '{1}' limit 1".format(id, created_time);
        utils.pool.getConnection(function (err, connection) {
            connection.query(query, function (err, rows) {
                connection.release();
                if (err) {
                    console.log(err);
                    return false;
                }

                if (rows.length > 0) {
                    query = "update anxiety set anxiety = '{0}', panic = '{1}', medicine = '{2}', sleep_time = '{3}', comment = '{4}' ".format(anxiety, JSON.stringify(panic), medicine, sleep_time, comment) +
                        "where user_id = (select * from (select user_id from anxiety where user_id = '{0}' and created_time = '{1}')as a) and created_time = '{1}'".format(id, created_time);
                    utils.pool.getConnection(function (err, connection) {
                        connection.query(query, function (err, rows) {
                            connection.release();
                            if (err) {
                                console.log(err);
                                return res.json({isSuccess: false, result: err});
                            }
                            return res.json({isSuccess: true});
                        });
                    });
                } else {
                    query = "INSERT INTO anxiety(user_id, created_time, anxiety, panic, medicine, sleep_time, comment) VALUES('{0}', '{1}', '{2}', '{3}', '{4}', '{5}', '{6}') ".format(id, created_time, anxiety, JSON.stringify(panic), medicine, sleep_time, comment);
                    utils.pool.getConnection(function (err, connection) {
                        connection.query(query, function (err, rows) {
                            connection.release();
                            if (err) {
                                console.log(err);
                                return res.json({isSuccess: false, result: err});
                            }
                            return res.json({isSuccess: true});
                        });
                    });
                }
            });
        });
    },
    adhdSelect: function (req, res) {
        let id = req.params.id;
        let date = req.params.date;

        if (isUndefined(id)) {
            res.status(500).send({isSuccess: false, message: "사용자 아이디 정보가 없음"})
            return;
        }

        if (isUndefined(date)) {
            res.status(500).send({isSuccess: false, message: "날짜 정보가 없음"})
            return;
        }

        let query = "select ad.user_id, ad.adhd, ad.sleep_time, ad.hyperactivity, ad.aggression, ad.drug_side_effects, ad.comment from adhd ad where ad.user_id = '{0}' and DATE(ad.created_time) = '{1}'".format(id, date);
        utils.pool.getConnection(function (err, connection) {
            connection.query(query, function (err, rows) {
                connection.release();
                if (err) {
                    console.log(err);
                    return res.json({isSuccess: false, result: err});
                }

                let rows_toJSON;
                if (rows[0] != null) {
                    rows_toJSON = {
                        user_id: rows[0].user_id,
                        adhd: rows[0].adhd,
                        sleep_time: rows[0].sleep_time,
                        hyperactivity: JSON.parse(rows[0].hyperactivity),
                        aggression: JSON.parse(rows[0].aggression),
                        drug_side_effects: JSON.parse(rows[0].drug_side_effects),
                        comment: rows[0].comment,
                        hyperCount: Object.values(JSON.parse(rows[0].hyperactivity)).filter(x => x > 0).reduce((a,b) => a+b, 0),
                        aggrCount: Object.values(JSON.parse(rows[0].aggression)).filter(x => x > 0).reduce((a,b) => a+b, 0),
                        drugCount: Object.values(JSON.parse(rows[0].drug_side_effects)).filter(x => x > 0).reduce((a,b) => a+b, 0)
                    };
                }
                
                return res.json({
                    isSuccess: true,
                    result: rows_toJSON,
                    hyperactivity: utils.hyperactivity,
                    aggression: utils.aggression,
                    drug_side_effects: utils.drug_side_effects
                });
                
            });
        });
    },
    adhdUpdate: function (req, res) {
        let user_id = req.body.user_id;
        let created_time = req.body.created_time;

        let adhd = req.body.adhd;
        let sleep_time = req.body.sleep_time;
        let hyperactivity = req.body.hyperactivity;
        let aggression = req.body.aggression;
        let drug_side_effects = req.body.drug_side_effects;
        let comment = req.body.comment;

        if (isUndefined(user_id) || isUndefined(created_time)) {
            return res.json({isSuccess: false, message: '누락된 정보가 있습니다.'});
        }
        if (typeof hyperactivity !== "object") {
            return res.json({isSuccess: false, message: '과잉행동 정보가 잘못 입력 되었습니다.', result: {params: "hyperactivity"}});
        }
        if (typeof aggression !== "object") {
            return res.json({isSuccess: false, message: '공격적 행동 정보가 잘못 입력 되었습니다.', result: {params: "aggression"}});
        }
        if (typeof drug_side_effects !== "object") {
            return res.json({
                isSuccess: false,
                message: '약물 부작용 정보가 잘못 입력 되었습니다.',
                result: {params: "drug_side_effects"}
            });
        }

        let query = "select * from adhd where user_id='{0}' and DATE(created_time) = '{1}' limit 1".format(user_id, created_time);
        utils.pool.getConnection(function (err, connection) {
            connection.query(query, function (err, rows) {
                connection.release();
                if (err) {
                    console.log(err);
                    return false;
                }

                if (rows.length > 0) {
                    query = "update adhd set adhd = '{0}', sleep_time = '{1}', hyperactivity = '{2}', aggression = '{3}', drug_side_effects = '{4}', comment = '{5}' ".format(adhd, sleep_time, JSON.stringify(hyperactivity), JSON.stringify(aggression), JSON.stringify(drug_side_effects), comment);
                    query += "where user_id = (select * from (select user_id from adhd where user_id = '{0}' and created_time = '{1}')as a) and created_time = '{1}'".format(user_id, created_time);
                    utils.pool.getConnection(function (err, connection) {
                        connection.query(query, function (err, rows) {
                            connection.release();
                            if (err) {
                                console.log(err);
                                return res.json({isSuccess: false, result: err});
                            }
                            return res.json({isSuccess: true});
                        });
                    });
                } else {
                    query = "INSERT INTO adhd(user_id, created_time, adhd, sleep_time, hyperactivity, aggression, drug_side_effects, comment) ";
                    query += "VALUES('{0}', '{1}', '{2}', '{3}', '{4}', '{5}', '{6}', '{7}') ".format(user_id, created_time, adhd, sleep_time, JSON.stringify(hyperactivity), JSON.stringify(aggression), JSON.stringify(drug_side_effects), comment);
                    utils.pool.getConnection(function (err, connection) {
                        connection.query(query, function (err, rows) {
                            connection.release();
                            if (err) {
                                console.log(err);
                                return res.json({isSuccess: false, result: err});
                            }
                            return res.json({isSuccess: true});
                        });
                    });
                }
            });
        });
    },
    moodMonthDate: function (req, res) {
        let id = req.params.id;
        let inputDate = new Date(req.params.date);

        if (isUndefined(inputDate) || inputDate == null || inputDate == "") {
            return res.json({isSuccess: false, message: '날짜를 선택해주세요.'});
        }

        let firstDate = utils.moment(new Date(inputDate.getFullYear(), inputDate.getMonth(), 1)).format('YYYY-MM-DD');
        let lastDate = utils.moment(new Date(inputDate.getFullYear(), inputDate.getMonth() + 1, 0)).format('YYYY-MM-DD');

        let query = "select m.user_id, m.mood, m.sleep_time, m.suicide, m.period, m.comment, DATE_FORMAT(m.created_time, '%Y-%m-%d') as created_time from mood m where m.user_id = '{0}' ".format(id);
        query += "and DATE(created_time) between '{0}' and '{1}' order by m.created_time".format(firstDate, lastDate);
        utils.pool.getConnection(function (err, connection) {
            connection.query(query, function (err, rows) {
                connection.release();
                if (err) {
                    console.log(err);
                    return res.json({isSuccess: false, result: err});
                }
                return res.json({
                    isSuccess: true,
                    result: rows
                });
            });
        });
    },
    anxietyMonthDate: function (req, res) {
        let id = req.params.id;
        let inputDate = new Date(req.params.date);

        if (isUndefined(inputDate) || inputDate == null || inputDate == "") {
            return res.json({isSuccess: false, message: '날짜를 선택해주세요.'});
        }

        let firstDate = utils.moment(new Date(inputDate.getFullYear(), inputDate.getMonth(), 1)).format('YYYY-MM-DD');
        let lastDate = utils.moment(new Date(inputDate.getFullYear(), inputDate.getMonth() + 1, 0)).format('YYYY-MM-DD');

        let query = "select an.user_id, an.anxiety, an.sleep_time, an.panic, an.medicine, an.comment, DATE_FORMAT(an.created_time, '%Y-%m-%d') as created_time from anxiety an where an.user_id = '{0}' and ".format(id);
        query += "date(an.created_time) between '{0}' and '{1}' order by an.created_time ".format(firstDate, lastDate);
        utils.pool.getConnection(function (err, connection) {
            connection.query(query, function (err, rows) {
                connection.release();
                if (err) {
                    console.log(err);
                    return res.json({isSuccess: false, result: err});
                }
                let for_rows = new Array();
                rows.forEach((element) => {
                    let rows_toJSON = {
                        user_id: element.user_id,
                        anxiety: element.anxiety,
                        sleep_time: element.sleep_time,
                        panic: JSON.parse(element.panic),
                        medicine: element.medicine,
                        comment: element.comment,
                        created_time: element.created_time
                    };
                    for_rows.push(rows_toJSON);
                });
                return res.json({isSuccess: true, result: for_rows, panic: utils.panic});
            });
        });
    },
    adhdMonthDate: function (req, res) {
        let id = req.params.id;
        let inputDate = new Date(req.params.date);

        if (isUndefined(inputDate) || inputDate == null || inputDate == "") {
            return res.json({isSuccess: false, message: '날짜를 선택해주세요.'});
        }

        let firstDate = utils.moment(new Date(inputDate.getFullYear(), inputDate.getMonth(), 1)).format('YYYY-MM-DD');
        let lastDate = utils.moment(new Date(inputDate.getFullYear(), inputDate.getMonth() + 1, 0)).format('YYYY-MM-DD');

        let query = "select ad.user_id, ad.adhd, ad.sleep_time, ad.hyperactivity, ad.aggression, ad.drug_side_effects, ad.comment, DATE_FORMAT(ad.created_time, '%Y-%m-%d') as created_time from adhd ad ";
        query += "where ad.user_id = '{0}' and  date(ad.created_time) between '{1}' and '{2}' order by ad.created_time".format(id, firstDate, lastDate);
        utils.pool.getConnection(function (err, connection) {
            connection.query(query, function (err, rows) {
                connection.release();
                if (err) {
                    console.log(err);
                    return res.json({isSuccess: false, result: err});
                }

                let for_rows = new Array();
                rows.forEach((element) => {
                    let rows_toJSON = {
                        user_id: element.user_id,
                        adhd: element.adhd,
                        sleep_time: element.sleep_time,
                        hyperactivity: JSON.parse(element.hyperactivity),
                        aggression: JSON.parse(element.aggression),
                        drug_side_effects: JSON.parse(element.drug_side_effects),
                        comment: element.comment,
                        created_time: element.created_time
                    };
                    for_rows.push(rows_toJSON);
                });

                return res.json({
                    isSuccess: true,
                    result: for_rows,
                    hyperactivity: utils.hyperactivity,
                    aggression: utils.aggression,
                    drug_side_effects: utils.drug_side_effects
                });
            });
        });
    },
    hospitalAuth: function (req, res) {
        let user_id = req.decoded.user_id;
        let hospital_auth = req.params.hospital_auth;

        let select_query = "select id, hospital, moodchecker_id, hospital_auth, 'P' as gubun ";
        select_query += "from patient where moodchecker_id = '" + user_id + "' and hospital_auth = '" + hospital_auth + "' ";
        select_query += "union all ";
        select_query += "select id, hospital, moodchecker_id, hospital_auth, 'C' as gubun ";
        select_query += "from children where parent_id = (select id from patient where moodchecker_id = '" + user_id + "') and hospital_auth = '" + hospital_auth + "'";

        utils.pool.getConnection(function (err, connection) {
            connection.query(select_query, function (err, rows) {
                connection.release();
                if (err) {
                    console.log(err);
                    return res.json({isSuccess: false, result: err});
                }

                if (rows.length > 0) {
                    let select_hospital_auth = {
                        id: rows[0].id,
                        hospital_id: rows[0].hospital,
                        user_id: rows[0].moodchecker_id,
                        hospital_auth: rows[0].hospital_auth,
                        user_gubun: rows[0].gubun
                    }

                    let select_hospital = "select h.id as hospital_id, h.name as hospital_name, ha.road_address_name, ha.latitude, ha.longitude from hospital h ";
                    select_hospital += " inner join hospital_address ha on h.id = ha.hospital_id ";
                    select_hospital += " where h.id = '" + select_hospital_auth.hospital_id + "'";

                    utils.pool.getConnection(function (err, connection) {
                        connection.query(select_hospital, function (err, rows) {
                            if (err) {
                                console.log(err);
                                return res.json({isSuccess: false, result: err});
                            }

                            return res.json({
                                isSuccess: true, result: {
                                    user: select_hospital_auth,
                                    hospital: rows[0]
                                }
                            });
                        });
                    });
                } else {
                    return res.json({isSuccess: false, message: "유효하지 않은 병원인증코드 입니다."});
                }
            });
        });
    },
    insertNotification: function (req, res) {
        const user_id = req.body.user_id;
        const hospital_id = req.body.hospital_id;
        const phone_num = req.body.phone_num;

        let select_query = `
            SELECT phone_num
            FROM notification
            WHERE hospital = '${hospital_id}'
            AND user_id = '${user_id}';
        `;

        utils.pool.getConnection(function (err, connection) {
            connection.query(select_query, function (err, rows) {
                connection.release();
                if (err) {
                    console.log(err);
                    return res.json({isSuccess: false, result: err});
                }

                let query = "";
                if (rows.length == 0) {
                    query = ` 
                        INSERT INTO notification(hospital, user_id, phone_num)
                        VALUES ('${hospital_id}', '${user_id}', '${phone_num}');
                    `;
                } else if (rows.length == 1) {
                    if (rows[0].phone_num === phone_num) {
                        return res.json({isSuccess: false, message: "이미 같은 병원·보건소에 같은 휴대전화 번호로 연결신청 건이 존재합니다."});
                    }
                    query = `
                        UPDATE notification 
                        SET phone_num = '${phone_num}'
                        WHERE hospital = '${hospital_id}'
                        AND user_id = '${user_id}';
                    `;
                }
                utils.pool.getConnection(function (err, connection) {
                    connection.query(query, function (err, rows) {
                        connection.release();
                        if (err) {
                            console.log(err);
                            return res.json({isSuccess: false, result: err});
                        }
                        return res.json({isSuccess: true, message: "검색하신 병원·보건소로 연결신청이 완료되었습니다."});
                    });
                });
            });
        });
    },
    findAddressKeyword: function (req, res) {
        const _keyword = req.body.keyword;
        const _address = req.body.address;

        if (isUndefined(_keyword) && isUndefined(_address)) {
            return res.json({isSuccess: false, message: "주소나 키워드 둘중 하나를 입력해 주세요."});
        }

        let query = "select h.id, h.name, ha.road_address_name, ha.longitude, ha.latitude from hospital h ";
        query += " inner join hospital_address ha on h.id = ha.hospital_id ";
        query += " where ";
        if (!isUndefined(_keyword) && !isUndefined(_address)) {
            query += " h.name like '%" + _keyword + "%' and ha.address_name like '%" + _address + "%';";
        } else if (!isUndefined(_keyword)) {
            query += " h.name like '%" + _keyword + "%'; ";
        } else if (!isUndefined(_address)) {
            query += " ha.address_name like '%" + _address + "%'; ";
        }

        utils.pool.getConnection(function (err, connection) {
            connection.query(query, function (err, rows) {
                connection.release();
                if (err) {
                    console.log(err);
                    return res.json({isSuccess: false, result: err});
                }

                return res.json({isSuccess: true, result: rows});
            });
        });
    },

    findXYCoordinate: function (req, res) {
        const hospital_id = req.body.hospital_id;
        const params_query = req.body.query;
        const Authorization = utils.daumApi.Authorization;
        const url = 'https://dapi.kakao.com/v2/local/search/keyword.json'; // 검색어로 검색

        let address_json = new Array();
        let push_message = "";

        if (typeof params_query === typeof undefined) {
            return res.json({isSuccess: false, message: '병원을 선택해주세요.'});
        }

        utils.unirest.get(url).header({
            'Content-Type': 'application/json',
            'Authorization': Authorization
        }).query({"query": params_query}).end(function (response) {
            if (response.body.meta.total_count > 0) {
                response.body.documents.forEach(element => {
                    if (element.category_group_code === 'HP8' || element.category_name.match(/(사회,공공기관 > 단체,협회|사회복지시설|사회복지시설|의료,건강)(?!(우체국))/)) { // 병원
                        let search_place_id = "select id from hospital_address where hospital_id = " + hospital_id;
                        let _address = {
                            hospital_id: hospital_id,
                            place_id: element.id,
                            category_group_code: element.category_group_code,
                            place_name: element.place_name,
                            address_name: element.address_name,
                            road_address_name: element.road_address_name,
                            longitude: element.x,
                            latitude: element.y,
                            phone: element.phone,
                            admin_name: "",
                            admin_email: "",
                            homepage: "",
                            blog: ""
                        };
                        address_json.push(_address);

                        utils.pool.getConnection(function (err, connection) {
                            connection.query(search_place_id, function (err, rows) {
                                connection.release();
                                if (err) {
                                    console.log(err);
                                    return res.json({isSuccess: false, result: err});
                                }
                                let query;

                                if (rows.length > 0) {
                                    query = "UPDATE brainmap.hospital_address SET "
                                    query += "place_id='{0}', category_group_code='{1}', place_name='{2}', address_name='{3}', road_address_name='{4}', ".format(_address.place_id, _address.category_group_code, _address.place_name, _address.address_name, _address.road_address_name);
                                    query += "longitude='{0}', latitude='{1}', admin_name='{2}', phone='{3}', admin_email='{4}', homepage='{5}', blog='{6}' ".format(_address.longitude, _address.latitude, _address.admin_name, _address.phone, _address.admin_email, _address.homepage, _address.blog);
                                    query += "WHERE hospital_id=" + hospital_id;
                                } else {
                                    query = "INSERT INTO brainmap.hospital_address (hospital_id, place_id, category_group_code, place_name, address_name, road_address_name, longitude, latitude, admin_name, phone, admin_email, homepage, blog) ";
                                    query += "VALUES('{0}', '{1}', '{2}', '{3}', '{4}', '{5}', '{6}', '{7}', '{8}', '{9}', '{10}', '{11}', '{12}');".format(hospital_id, _address.place_id, _address.category_group_code, _address.place_name, _address.address_name, _address.road_address_name, _address.longitude, _address.latitude, _address.admin_name, _address.phone, _address.admin_email, _address.homepage, _address.blog);
                                }

                                utils.pool.getConnection(function (err, connection) {
                                    connection.query(query, function (err, rows) {
                                        connection.release();
                                        if (err) {
                                            console.log(err);
                                            return res.json({isSuccess: false, result: err});
                                        }
                                    }); // end connection.query
                                }); // end insert utils.pool.getConnection
                            }); //end select query
                        }); // end select connection
                    } //end if categorys
                }); /// end foreach
            } else {
                push_message = "검색된 주소가 없습니다.";
            }
            return res.json({
                isSuccess: true,
                message: push_message,
                result: {
                    address: address_json
                },
            });
        });
    }
}; //end module