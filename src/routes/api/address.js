const mysql = require('mysql');
const dbInfo = require('../../../dbInfo.json');

const moment = require('moment');
const unirest = require('unirest');
const utils = require('./appAPI.utils');
const daumApi = require('../../config/daumApi.js');


exports.findAddressKeyword = (req, res) => {
    
    const params_query = req.params.query;
	const Authorization = daumApi.Authorization;
	const url = 'https://dapi.kakao.com/v2/local/search/keyword.json'; // 검색어로 검색

	let address_json = new Array();
	let push_message = "";

	if (typeof params_query === typeof undefined) {
		return res.json({isSuccess: false, result: {message: '주소를 입력해주세요.'}});
	}

	unirest.get(url).header({
		'Content-Type': 'application/json',
		'Authorization': Authorization
	}).query({"query": params_query}).end(function (response) {
		if (response.body.meta.total_count > 0) {
			response.body.documents.forEach(element => {
				console.log(element);
				if (element.category_group_code === 'HP8' || element.category_name.match(/(사회,공공기관 > 단체,협회|사회복지시설|사회복지시설|의료,건강)(?!(우체국))/)) { // 병원
					let search_place_id = "select id from hospital_address where place_id = " + element.id;
					let _address = {
						place_id: element.id,
						category_group_code: element.category_group_code,
						place_name: element.place_name,
						address_name: element.address_name,
						road_address_name: element.road_address_name,
						longitude: element.y,
						latitude: element.x,
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

							if (rows.length == 0) {
								let query = "INSERT INTO brainmap.hospital_address (place_id, category_group_code, place_name, address_name, road_address_name, longitude, latitude, admin_name, phone, admin_email, homepage, blog) ";
								query += "VALUES('{0}', '{1}', '{2}', '{3}', '{4}', '{5}', '{6}', '{7}', '{8}', '{9}', '{10}', '{11}');".format(_address.place_id, _address.category_group_code, _address.place_name, _address.address_name, _address.road_address_name, _address.longitude, _address.latitude, _address.admin_name, _address.phone, _address.admin_email, _address.homepage, _address.blog);

								utils.pool.getConnection(function (err, connection) {
									connection.query(query, function (err, rows) {
										connection.release();
										if (err) {
											console.log(err);
											return res.json({isSuccess: false, result: err});
										}
									}); // end connection.query
								}); // end insert utils.pool.getConnection
							} //end if rows.length
						}); //end select query
					}); // end select connection
				} //end if categorys
			}); /// end foreach
		} else {
			push_message = "검색된 주소가 없습니다.";
		}
		return res.json({
			isSuccess: true,
			result: {
				message: push_message,
				address: address_json
			},
		});
	});
}