const moodchecker = typeof getUrlVars()["moodchecker"] === typeof undefined ? "Mood" : getUrlVars()["moodchecker"];

let weatherIconNames = ["wi-day-sunny", "wi-day-cloudy", "wi-day-cloudy-gusts", "wi-day-cloudy-windy", "wi-day-fog", "wi-day-hail", "wi-day-haze", "wi-day-lightning", "wi-day-rain",
    "wi-day-rain-mix", "wi-day-rain-wind", "wi-day-showers", "wi-day-sleet", "wi-day-sleet-storm", "wi-day-snow", "wi-day-snow-thunderstorm", "wi-day-snow-wind", "wi-day-sprinkle",
    "wi-day-storm-showers", "wi-day-sunny-overcast", "wi-day-thunderstorm", "wi-day-windy", "wi-solar-eclipse", "wi-hot", "wi-day-cloudy-high", "wi-day-light-wind", "wi-night-clear",
    "wi-night-alt-cloudy", "wi-night-alt-cloudy-gusts", "wi-night-alt-cloudy-windy", "wi-night-alt-hail", "wi-night-alt-lightning", "wi-night-alt-rain", "wi-night-alt-rain-mix",
    "wi-night-alt-rain-wind", "wi-night-alt-showers", "wi-night-alt-sleet", "wi-night-alt-sleet-storm", "wi-night-alt-snow", "wi-night-alt-snow-thunderstorm", "wi-night-alt-snow-wind",
    "wi-night-alt-sprinkle", "wi-night-alt-storm-showers", "wi-night-alt-thunderstorm", "wi-night-cloudy", "wi-night-cloudy-gusts", "wi-night-cloudy-windy", "wi-night-fog", "wi-night-hail",
    "wi-night-lightning", "wi-night-partly-cloudy", "wi-night-rain", "wi-night-rain-mix", "wi-night-rain-wind", "wi-night-showers", "wi-night-sleet", "wi-night-sleet-storm", "wi-night-snow",
    "wi-night-snow-thunderstorm", "wi-night-snow-wind", "wi-night-sprinkle", "wi-night-storm-showers", "wi-night-thunderstorm", "wi-lunar-eclipse", "wi-stars", "wi-storm-showers", "wi-thunderstorm",
    "wi-night-alt-cloudy-high", "wi-night-cloudy-high", "wi-night-alt-partly-cloudy"];
let dsmv_contents = Object.values(dsmv).sort(function (a, b) {
    return a.sort - b.sort;
});
let $weatherError = $("#weather-error");
let patientName;

//index 페이지 들어 왔을때 그래프의 scale_tit에 따라 해당 Result 페이지로 이동 - 2018.10.26 by JH
let doctor_scale = {'CGI': 1, 'HRSD': 1, 'HAS': 1, 'CDR': 1, 'GDS': 1, 'MMSE': 1, 'NPI': 1, 'KADL': 1};
let scale_tit = $(".scale-title-label").text();

(function dsmv() {
    let dsmv_html = "";
    let filter_dsmv_content = dsmv_contents.filter(value => value.hospital_used != 0);
    if (filter_dsmv_content.length > 0) {
        filter_dsmv_content.forEach(function (value, index) {
            dsmv_html += setDsmvHtml(value, index);
        });
    } else {
        dsmv_contents.filter(value => value.default > 0).forEach(function (value, index) {
            dsmv_html += setDsmvHtml(value, index);
        });
    }
    $("#dsmv-choice-box").append(dsmv_html);
})(jQuery);

function setDsmvHtml(value, index) {
    let html = "";
    if (index % 3 == 0) html += '<div>';
    html +=
        `<div class="col-md-4 c-todo" style="float: left; padding: 0.73rem 1.875rem;">
        <span class="dsmv-check">
            <input class="c-todo__input dsmv-checkbox" type="checkbox" id="${value.code}" data-code="${value.code}" data-group-code="${value.title_code}" title="${value.code}"`;
    if (value.patient_is_checked) html += ` checked="checked" `;
    html += `><label class="c-todo__label dsmv-item-title" for="${value.code}">${value.question_name}</label>`;
    if (value.question_code === "000") html += `<i class="fas fa-chevron-circle-right" style="cursor: pointer;" onclick="javascript:location.href='/dsmv#${value.title_code}'"></i>`;
    html += `</span></div>`;

    if (index % 3 == 2) html += '</div>';
    return html;
}

(function onLoad() {
    if (typeof Cookies.get("patient") != typeof undefined) {
        patientData = JSON.parse(Cookies.get("patient"));
        patientId = patientData.id;
        patientName = patientData.name;
    }

    let is_cognition = Object.values(dsmv).filter(value => value.title_code == "Q" && value.patient_is_checked == 1);
    if (typeof location.href.split("&QSelect=")[1] === typeof undefined) {
        if (is_cognition.length > 0) {
            location.href = "/?moodchecker=Cognition&QSelect=1";
        }
    }

    // $(".open").removeClass("open");
    // $(".active").attr('class', '');
    // $(".nav-item .has-sub:contains('Dashboard')").addClass('open');
    // $(".menu-content > li:contains('" + moodchecker + "')").addClass('active');
})(jQuery);

$(document).ready(function () {
    if (typeof patientData != typeof undefined) {
        $.ajax({
            type: 'GET',
            url: '/moodchecker/user/' + patientData.moodchecker_id + "/" + moodchecker + "/" + $("#datepicker").val(),
            success: function (data) {
                if (data["isSuccess"]) {
                    moodchecker_length = data["result"].length;
                    drawMoodGraph(data["result"], moodchecker.toLowerCase())
                    if (moodchecker === "Cognition") {
                        return;
                    }
                    // COMMENT list
                    drawCommentsTable(data["result"].map(function (item) {
                        return {
                            "created_time": moment(item.created_time).format("YY-MM-DD"),
                            "comment": item.comment
                        }
                    }));

                    if (moodchecker === "Mood") {
                        analysis(data["result"], true);
                    }
                } else {
                    $.alert({
                        title: "",
                        content: data["message"]
                    });
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log('error : ' + textStatus);
                console.log('error : ' + errorThrown);
                alert("기분 정보 요청에 실패하였습니다");
            },
            contentType: "application/json"
        });
    }

    if (doctor_scale[scale_tit] == 1) {
        $("#graph-more").attr("href", "/doctorResult?scale=" + scale_tit);
    } else {
        $("#graph-more").attr("href", "/patientResult?scale=" + scale_tit);
    }
});

let keys = [];
$(document.body).keydown(function (e) {
    keys[e.which] = true;

    if (keys[17] && keys[18] && keys[67]) {
        if ($("#analysis-div").css("display") != "none") {
            let mood_text = $(".analysis-mood").children("div").text().textTrim();
            let sleep_text = $(".analysis-sleep-time").children("div").text().textTrim();
            let lack_sleep_text = $(".analysis-lack-sleep").children("div").text().textTrim();
            let suicide_text = $(".analysis-suicide").children("div").text().textTrim();
            let copy_text = moment($("#datepicker").val()).format('YYYY년 MM월 환자분석') + "\n" + mood_text + "\n" + sleep_text + "\n" + lack_sleep_text + "\n" + suicide_text;

            let el = document.createElement('textarea');
            el.value = copy_text;
            el.style = {position: 'absolute', left: '-9999px'};
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            $("#analysis-modal").show();

            setTimeout(function () {
                $("#analysis-modal").hide();
            }, 800);
        }
        keys[17] = false;
        keys[18] = false;
        keys[67] = false;
    }
});

$(document.body).keyup(function (e) {
    keys[e.which] = false;
});

String.prototype.textTrim = function () {
    return this.replace(/\s\s/g, "").replace(/\s+$/g, '');
    ;
};

(function callEvent() {
    /************click************/
    $("#dashboard-modal .modal-content .close").click(function () {
        $("#dashboard-modal").hide();
    });

    $("#dashboard-modal").click(function (e) {
        //$("#dashboard-modal").hide();
    });

    //DSMV-V의 save 버튼 클릭 시 - 2018.09.28 by JH
    $("#dsmv_save").click(function () {
        $.confirm({
            type: "green",
            icon: "far fa-save",
            title: "DSM-V 저장",
            content: "DSM-V의 정보를 저장하시겠습니까?",
            buttons: {
                saveButton: {
                    text: "저장",
                    action: function () {
                        location.reload();
                    }
                },
                cancleButton: {
                    text: "취소"
                }
            }
        });
    });

    $("#notice-modal .close").on("click", function () {
        $("#notice-modal").css("display", "none")
    });

    $("#app-tot-modal .close").on("click", function () {
        $("#app-tot-modal").css("display", "none")
    });

    //modal-content 외의 부분 클릭 시 modal (display:none)
    $(document).mouseup(function (e) {
        var modal_content = $(".modal-content");
        if (!modal_content.is(e.target) && modal_content.has(e.target).length === 0) {
            $(".modal").css("display", "none")
        }
    });

    //Dashboard SubMenu 선택 시 효과
    $(".Dashboard-menu").click(function (e) {
        var texts = $(this).text().replace(/(\s*)/g, '');

        // $(".active").attr('class', '');
        // $(".menu-content > li:contains('" + texts + "')").addClass('active');
        // $("#mood-title").text(texts);

        e.preventDefault();
        let is_cognition = Object.values(dsmv).filter(value => value.title_code == "Q" && value.patient_is_checked == 1);
        if (is_cognition.length > 0) {
            location.href = "/?moodchecker=" + texts + "&QSelect=1";
        } else {
            location.href = "/?moodchecker=" + texts;
        }
    });

    //DATA table tr 클릭 시 - 2018.10.26 by JH
    $(".c-table").on("click", ".record", function () {
        if (typeof patientId == typeof undefined) {
            return
        }
        let scale = $(this).attr("scale");

        //scale에 맞는 그래프 다시 그려주기
        $("#js-chart-patient").remove();
        $(".scale-indicator").append('<canvas id="js-chart-patient" width="300" height="105"></canvas>');
        requestResult(scale, patientId);

        //그래프의 more 클릭 시 해당 Result 페이지로 이동
        if (doctor_scale[scale] == 1) {
            $("#graph-more").attr("href", "/doctorResult?scale=" + scale);
        } else {
            $("#graph-more").attr("href", "/patientResult?scale=" + scale);
        }
    });

    /************change************/
    $(".dsmv-checkbox").change(function () {
        if (typeof patientId == typeof undefined) {
            $.alert({
                title: "",
                content: "지정된 환자가 없습니다.<br/>먼저 환자를 검색후 선택 해주세요."
            });
            $(this).attr("checked", false);
            return;
        }

        dsmv_contents.forEach(value => {
            if (value.code === $(this).attr("data-code")) {
                value.patient_is_checked = $(this).is(":checked") ? 1 : 0;
            }
        });

        $.post(`/patient/${patientId}/dsmv`, {
            dsmv: JSON.stringify(dsmv_contents)
        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.log('error : ' + textStatus);
            console.log('error : ' + errorThrown);
            alert("DSM-V 데이터 갱신에 실패하였습니다");
        });
    });

    $("#scale-name-search").on("input", function (event) {
        if (event.keycode == 13) {
            event.preventDefault();
        }
        let keyword = $("#scale-name-search").val().toLowerCase()
        filterResultTableByScale(keyword);
    });
})(jQuery);

(function timer() {
    if (patientId == undefined) {
        $(".c-project-card__meta").hide();
        $(".data-graph").hide();
        $(".scale-data-wrapper").hide();
        clearTimeout(timer);
    } else {
        $(".data-graph").show();
        $(".scale-data-wrapper").show();

        //검사결과 slide
        $('.state-wrapper .state').hide();
        $('.state-wrapper .state:first-child').show();
        timer = setInterval(function () {
            $('.state-wrapper .state:first-child').hide()
            .next('.state').fadeIn(2500)
            .end().appendTo('.state-wrapper');
        }, 3000);
    }
})(jQuery);

(function top4_box() {
    //환자분석 - 자살 위험성
    if (analysis_risk > 0) {
        $("#analysis-risk").text("자살 위험성이 높은 환자입니다.");
    }

    //환자분석 - 수면
    switch (analysis_sleep) {
        case 'case1':
            $("#analysis-sleep").text("평가 정확성에 대한 확인이 필요합니다.");
            break;
        case 'case2':
            $("#analysis-sleep").text("평가 정확성에 대한 확인이 필요합니다.");
            break;
        case 'case3':
            $("#analysis-sleep").text("수면 패턴에 대한 확인이 필요합니다.");
            break;
        case 'case4':
            $("#analysis-sleep").text("수면 패턴에 대한 확인이 필요합니다.");
            break;
        case 'case5':
            $("#analysis-sleep").text("수면 패턴에 대한 확인이 필요합니다.");
            break;
        case 'case6':
            $("#analysis-sleep").text("수면에 대한 개입이 필요합니다.");
            break;
        case 'case7':
            $("#analysis-sleep").text("수면 패턴에 대한 확인이 필요합니다.");
            break;
        case 'case8':
            $("#analysis-sleep").text("수면에 대한 개입이 필요합니다.");
            break;
    }

    //치료추천 - 마지막 검사
    if (top_cnt[0].cnt > 0) { //일반환자
        $("#last-data").append("마지막 검사 후 " + top_cnt[0].cnt + "일이 지났습니다.");
    }

    if (top_cnt[1].cnt > 0) { //자녀
        $("#last-data").append("마지막 검사 후 " + top_cnt[1].cnt + "일이 지났습니다.");
    }

    //병원정보 - 등록된환자
    $("#hospital-tot").append(top_cnt[2].cnt + "명");

    //병원정보 - 앱 업데이트
    $("#app-tot").append(top_cnt[3].cnt + "명");

    //병원정보 - 앱 업데이트 클릭 시 Modal
    $("#app-tot").on("click", function () {
        const appTotal = top_cnt[3].cnt;
        // if(){} 호출 전 환자수 체크 0이면 안타게
        if (appTotal === 0) {
            $.alert({
                title: "",
                content: '어제 앱 업데이트 환자가 0명입니다.'
            });
            return;
        } else {
            $("#app-tot-modal").css("display", "block");
            getAppPatientList();
        }
    });

    function getAppPatientList() {
        $.get("/appPatient/getListByHospital").done(function (data) {
            if (data["isSuccess"]) {
                var appData = data["appPatientList"];
                makeHtml(appData);
            }
        }).fail(function (jqXHR) {
            console.log('error : ' + jqXHR);
            return;
        });
    }

    function makeHtml(appData) {
        const dataLen = appData.length;
        let aHTML = [];
        for (i = 0; i < dataLen; i++) {
            let result = appData[i];
            aHTML.push(`<tr><td>${result.name}</td>
                        <td>${(result.gender === 'M') ? `${'남'}` : `${'여'}`}</td>
                        <td>${result.birthdate}</td>
                        <td>${result.history_number}</td></tr>`
            );
        }
        $('#app-list').children().remove();
        $('#app-list').append(aHTML);
    }

})(jQuery);

(function getGeoInfo() {
    $.post('https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyA7vjxA5mxErquZMlcr-zjbUlijHuwXXfI').done(function (data) {
        let lat = data["location"]["lat"];
        let lon = data["location"]["lng"];
        getCityInfo(lat, lon);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log('error : ' + textStatus);
        console.log('error : ' + errorThrown);
        $weatherError.html("위치정보를 받아오는데 실패했습니다.");
    });
})(jQuery);

(function datePicker() {
    $("#datepicker").datepicker({
        language: "en",
        keyboardNav: false,
        autoClose: true,
        todayButton: new Date(),
        onSelect: function () {
            $(this).change();
            callByMoodchecker();
        }
    }).data('datepicker').selectDate(new Date(), true);

    $("#preview").click(function () {
        let minusDate = new Date($("#datepicker").val());
        minusDate.setMonth(minusDate.getMonth() - 1);
        setDatepickers(minusDate);
    });

    $("#next").click(function () {
        let plusDate = new Date($("#datepicker").val());
        plusDate.setMonth(plusDate.getMonth() + 1);
        setDatepickers(plusDate);
    });
})(jQuery);

(function slider() {
    $(".slide-bar li").click(function (e) {
        if ($(this).hasClass('slider')) {
            return;
        }
        let whatTab = $(this).index();
        let howFar = 50 * whatTab;

        $(".slider").css({
            left: howFar + "%"
        });

        $(".ripple").remove();
        let posX = $(this).offset().left,
            posY = $(this).offset().top,
            buttonWidth = $(this).width(),
            buttonHeight = $(this).height();

        $(this).prepend("<span class='ripple'></span>");
        if (buttonWidth >= buttonHeight) {
            buttonHeight = buttonWidth;
        } else {
            buttonWidth = buttonHeight;
        }

        let x = e.pageX - posX - buttonWidth / 2;
        let y = e.pageY - posY - buttonHeight / 2;
        $(".ripple").css({
            width: buttonWidth,
            height: buttonHeight,
            top: y + 'px',
            left: x + 'px'
        }).addClass("rippleEffect");
    });

    $("#slide-comment").on("click", function () {
        slideVisiblity($("#slide-bar"), "C");
    });

    $("#slide-analysis").on("click", function () {
        slideVisiblity($("#slide-bar"), "A");
    });

    $("#slide-insurance").on("click", function () {
        slideVisiblity($("#slide-bar"), "I");
    });
})(jQuery);

function slideVisiblity($slide, type) {
    if (type === "C") {
        $("#mood-comments-table-box").show();
        $("#analysis-div").hide();
        $("#insurance-div").hide();
        $(".slider").attr("style", "left: 0%;");
    } else if (type === "A") {
        $("#mood-comments-table-box").hide();
        $("#insurance-div").hide();
        $(".slider").attr("style", "left: 50%;");

        if (moodchecker === "Mood" && $(".slider").attr("style") === "left: 50%;" && moodchecker_length > 0) {
            $("#analysis-div").show();
        } else {
            $("#analysis-div").hide();
        }
    } else if (type === "I") {
        $("#mood-comments-table-box").hide();
        $("#analysis-div").hide();
        $("#insurance-div").show();
    }
}

function analysis(mood_result, loading) {
    if (mood_result.length == 0) {
        $("#analysis-div").hide();
        return;
    }
    if (loading) {
        $("#analysis-div").hide();
    } else if (moodchecker === "Mood" && $(".slider").attr("style") === "left: 50%;" && moodchecker_length > 0) {
        $("#analysis-div").show();
    }
    $("#analysis-date").html($("#datepicker").val());

    let analysis_count = mood_result.filter(value => value.id > 0).length;
    let start_value = false;
    let copy_value = {};
    let analysis_mood_result = mood_result.reverse().map(value => {
        let value_date = value.created_time;
        if (value.id != -1) {
            $.extend(copy_value, value);
        }

        if (value.id == -1 && !$.isEmptyObject(copy_value)) {
            let paste_value = $.extend(new Object(), copy_value);
            paste_value.id = -1;
            paste_value.created_time = value_date;
            return paste_value;
        }
        return value;
    }).reverse().map(value => {
        if (value.id > -1) {
            start_value = true;
        }

        if (!start_value) {
            return false;
        }
        return value;
    });

    //평균기분
    //filter(value => value.id > -1)
    let mood = (analysis_mood_result.filter(value => value).map((item) => {
        return item.mood;
    }).reduce((a, b) => a + b) / analysis_count).toFixed(1);

    //평균 수면시간
    let sleep = (analysis_mood_result.filter(value => value.id > -1).map((item) => {
        return parseInt(item.sleep_time, 10);
    }).reduce((a, b) => a + b) / analysis_count).toFixed(1);

    //수면부족 횟수
    let lack_sleep_count = analysis_mood_result.filter(value => value.id > -1).map((item) => {
        return parseInt(item.sleep_time, 10) <= 5 ? 1 : 0;
    }).reduce((a, b) => a + b);

    //기분이 고양되어있는 횟수
    let up_count = 0;
    //기분이 다운되어있는 횟수
    let down_count = 0;
    let icon_img_name = analysis_mood_result.filter(value => value).map((item) => {
        up_count += item.mood >= 2 ? 1 : 0;
        down_count += item.mood <= -2 ? 1 : 0;

        if (up_count > 0 && item.mood < 2) {
            up_count = 0;
        }

        if (down_count > 0 && item.mood > -2) {
            down_count = 0;
        }

        return {up_count: up_count, down_count: down_count};
    }).map(function (item) {
        return item.up_count >= 7 ? "uplifting" : item.down_count >= 7 ? "dysthymia" : "";
    }).sort(function (a, b) {
        if (a.toUpperCase() < b.toUpperCase()) {
            return 1;
        }

        if (b.toUpperCase() < a.toUpperCase()) {
            return -1;
        }
        return 0;
    })[0];

    //심한 기분변동
    let emotion_change = analysis_mood_result.filter(value => value).map((value, index, array) => {
        let this_mood = array[index].mood;
        let pre_mood = typeof array[index - 1] === typeof undefined ? "10" : array[index - 1].mood;

        let this_sign = Math.sign(this_mood);
        let pre_sign = Math.sign(pre_mood);

        if (pre_mood > 4 || pre_mood < -4) {
            return 0;
        }

        if ((this_sign != 0 && pre_sign != 0) && this_sign != pre_sign) {
            return 1;
        }
        return 0;
    }).reduce((a, b) => a + b);

    //자살 사고 횟수
    let suicide = analysis_mood_result.filter(value => value).map(function (item) {
        return item.suicide ? 1 : 0;
    }).reduce((a, b) => a + b);

    $("#patient-name").html(patientName);
    $("#average").html(mood);
    $("#sleep").html(sleep);
    $("#lack-sleep").html(lack_sleep_count);
    $("#analysis-suicide-text").html(suicide);
    $("#emotion_change").html(emotion_change);
    $("#analysis-count").html(analysis_count);

    $("#analysis-mood-icon img").remove();
    $("#analysis-mood-text").html("");
    if (icon_img_name != "") {
        $("#analysis-mood-text").html(icon_img_name === "uplifting" ? "기분 고양" : "기분 저하");
        $("#analysis-mood-icon").append('<img src="img/main/' + icon_img_name + '.png" width="15" height="15" />');
    } else {
        $("#analysis-mood-text").html();
    }
}

(function education() {
    $.ajax({
        type: 'GET',
        url: '/education',
        success: function (응답) {
            if (!응답["isSuccess"]) {
                alert(응답["message"]);
            } else {
                drawEducationItems(응답["results"])
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log('error : ' + textStatus);
            console.log('error : ' + errorThrown);
            alert("교육자료를 받아오는데 실패하였습니다");
        },
        contentType: "application/json"
    });

    function drawEducationItems(results) {
        results.forEach(function (item, i) {
            var itemTag =
                `<article class="c-plan" style="padding: 20px 20px 25px;">
                    <img class="c-project-card__img" src="img/main/0${i + 1}.jpg" alt="About the image">
                    <h4>
                        <span class="edu-title">${item.title}</span>
                        <span class="edu-date">${item.created_time}</span>
                    </h4>
                    <span class="c-plan__divider" style="margin: 7px 0 12px;"></span>
                    <ul>
                        <li class="c-plan__feature">
                            ${item.description}
                        </li>
                    </ul>
                </article>`;
            $("#home-edu-slick" + (i + 1)).append(itemTag);
        })
    }
})(jQuery);

(function scales() {
    /* result 데이터를 테이블에 넣음 */
    let records = "";

    for (i = 0; i < results.length; i++) {
        let result = results[i];
        records += "<tr class='record c-table__row' id='" + result["scaleName"] + "' scale='" + result["scaleName"] + "' result-id='" + result["result_id"] + "'>";

        records += "<td class='c-table__cell u-text-mute'>"
        records += "<label class='lab_info' for='scale-date'>";
        records += result["scaleDate"];
        records += "</label>";
        records += "</td>";

        records += "<td class='c-table__cell'>";
        records += "<label class='lab_info' for='scale-name'>";
        records += result["scaleName"];
        records += "</label>";
        records += "</td>";

        records += "<td class='c-table__cell u-text-mute'>";
        records += "<label class='lab_info' for='scale-value'>";
        records += result["value"];
        records += "</label>";
        records += "</td>";

        records += "<td class='c-table__cell'>";
        records += "<label class='lab_info' for='scale-count'>";
        records += result["rnum"];
        records += "</label>";
        records += "</td>";
        records += "</tr>";

        if (i == 0) {
            $(".scale-graph .scale-title-label").replaceWith("<label class='scale-title-label'>" + result["scaleName"] + "</label>");
            let scale = result["scaleName"];
            requestResult(scale, patientId);
        }
    }
    $(records).insertBefore(".c-table .empty-record");
})(jQuery);

function requestResult(scale, patientId) {
    if (typeof patientId == typeof undefined) {
        return
    }
    $.ajax({
        type: 'GET',
        url: '/patient/result?scale=' + scale + '&patientId=' + patientId,
        success: function (data) {
            if (data["isSuccess"]) {
                drawScaleGraph(data["result"]);
            } else {
                $.alert({
                    title: "",
                    content: "스케일 결과를 가져오는데 실패하였습니다 : " + data["message"]
                });
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log('error : ' + textStatus);
            console.log('error : ' + errorThrown);
            alert("스케일 결과를 가져오는데 실패하였습니다 : " + errorThrown);
        },
        contentType: "application/json"
    });
}

function drawScaleGraph(rawResults) {
    if (typeof patientData == typeof undefined || typeof rawResults == typeof undefined || rawResults.length == 0) {
        alert("스케일 결과를 가져오는데 실패하였습니다 : " + data["message"]);
        return;
    }
    var name = patientData["name"];
    var scale = rawResults[0].scale;

    let results = rawResults;
    var dates = [];
    var datas = [];

    $(".scale-title-label").text(scale);

    results.forEach(function (item, index) {
        dates.push(moment(item["date"]).format("MM-DD"));
        datas.push(item["value"]);
    });
    while (dates.length < 10) {
        dates.push(" ")
    }
    while (datas.length <= 10) {
        datas.push(0)
    }

    var chartPatient = document.getElementById("js-chart-patient");

    //chart-patient 설정
    var barChartPatientData = {
        labels: dates,
        datasets: [{
            label: [name],
            data: datas,
            fill: true,
            lineTension: 0,
            backgroundColor: 'rgb(25, 179, 48)',
            borderWidth: 1,
            borderColor: "rgb(25, 179, 48)",
            spanGaps: false
        }]
    };

    if (chartPatient) {
        var barChartPatient = new Chart(chartPatient, {
            type: 'roundedBar',
            data: barChartPatientData,
            options: {
                legend: {
                    display: false,
                },
                layout: {
                    padding: {
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0
                    }
                },
                scales: {
                    xAxes: [{
                        barPercentage: 0.6,
                        ticks: {
                            fontSize: '11',
                            fontColor: '#969da5'
                        },
                        gridLines: {
                            color: 'rgba(0,0,0,0.0)',
                            zeroLineColor: 'rgba(0,0,0,0.0)'
                        }
                    }],
                    yAxes: [{
                        display: false,
                        gridLines: {
                            zeroLineColor: 'rgba(0,0,0,0.0)'
                        },
                        ticks: {
                            beginAtZero: true,
                            fontSize: '11',
                            fontColor: '#969da5'
                        }
                    }]
                }
            }
        });
    }

    //chart-patient 클릭 시 해당 검사 페이지 이동 - 위에 선언한 let results = rawResults; 통해 클릭 시 해당 id값을 가져와 페이지 이동
    chartPatient.onclick = function (evt, idx) {
        var activeCharts = barChartPatient.getElementAtEvent(evt);
        if (activeCharts.length > 0) {
            var clickedElementindex = activeCharts[0]._index;
            if (typeof results[clickedElementindex].id === typeof undefined) {
                return;
            } else {
                var resultId = results[clickedElementindex].id;
            }
            if (confirm("선택한 검사 결과를 열람합니다.")) {
                window.location.href = "/edit/" + resultId;
            }
        }
    };
}

function setDatepickers(date) {
    $("#datepicker").datepicker({
        language: "en",
        keyboardNav: false,
        autoClose: true,
        todayButton: new Date(),
        onSelect: function () {
            $(this).change();
            callByMoodchecker();
        }
    }).data('datepicker').selectDate(date);
    callByMoodchecker();
}

function callByMoodchecker() {
    if (typeof patientData != typeof undefined) {
        $.ajax({
            type: 'GET',
            url: '/moodchecker/user/' + patientData.moodchecker_id + "/" + moodchecker + "/" + $("#datepicker").val(),
            success: function (data) {
                if (data["isSuccess"]) {
                    moodchecker_length = data["result"].length;
                    $("#graph-desc-block").hide();
                    drawMoodGraph(data["result"], moodchecker.toLowerCase())

                    if (moodchecker === "Cognition") {
                        return;
                    }
                    // COMMENT list
                    drawCommentsTable(data["result"].map(function (item) {
                        return {
                            "created_time": moment(item.created_time).format("YY-MM-DD"),
                            "comment": item.comment
                        }
                    }));

                    if (moodchecker === "Mood") {
                        analysis(data["result"]);
                        slideVisiblity($("#slide-bar"), "C");
                    }
                } else {
                    $.alert({
                        title: "",
                        content: data["message"]
                    });
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log('error : ' + textStatus);
                console.log('error : ' + errorThrown);
                alert("기분 정보 요청에 실패하였습니다");
            },
            contentType: "application/json"
        });
    }
}

function drawMoodGraph(rawResults, moodchecker) {
    $("#js-chart-moodchecker").remove();
    $("#m-graph").append('<canvas id="js-chart-moodchecker" width="1000" height="400"></canvas>');
    let ctx = document.getElementById("js-chart-moodchecker").getContext('2d');
    $("#pics").show();
    if (rawResults.length == 0) {
        $("#pics").hide();
        return;
    }

    if (moodchecker == "cognition") {
        return;
    }

    rawResults = rawResults.slice().reverse();

    let startDate = rawResults[0].created_time;
    let endDate = rawResults[rawResults.length - 1].created_time;
    let dates = moment(startDate).twix(endDate).toArray('days').map(function (item) {
        return item.format("D");
    });

    let results = dates.map(function (item) {
        let result = rawResults.filter(function (rawResult) {
            return moment(rawResult.created_time).format("D") == item
        });
        return (result.length > 0) ? result[0] : setEmptyResult(item, moodchecker);
    });
    let moods = results.map(function (item) {
        return item.mood;
    });
    let anxietys = results.map(function (item) {
        return item.anxiety;
    });
    let adhds = results.map(function (item) {
        return item.adhd;
    });
    let sleepTimes = results.map(function (item) {
        return item.sleep_time;
    });

    function setDatas(moodchecker) {
        let datasets = [];
        if (moodchecker == "mood") {
            // mood - 기분 (line 차트)
            datasets.push({
                type: "line",
                label: "기분",
                data: moods,
                backgroundColor: "rgb(111, 205, 216, 0.6)",
                borderColor: "rgba(111, 205, 216, 1.00)",
                borderWidth: 1.5,
                pointBackgroundColor: "rgba(255, 255, 255)",
                pointRadius: 5,
                yAxisID: "mood-y-axis"
            });
        } else if (moodchecker == "anxiety") {
            // anxiety - 불안 (line 차트)
            datasets.push({
                type: "line",
                label: "불안",
                data: anxietys,
                backgroundColor: "rgb(111, 205, 216, 0.6)",
                borderColor: "rgba(111, 205, 216, 1.00)",
                borderWidth: 1.5,
                pointBackgroundColor: "rgba(255, 255, 255)",
                pointRadius: 5,
                yAxisID: "anxiety-y-axis"
            });
        } else if (moodchecker == "adhd") {
            // adhd - adhd (line 차트)
            datasets.push({
                type: "line",
                label: "ADHD",
                data: adhds,
                backgroundColor: "rgb(111, 205, 216, 0.6)",
                borderColor: "rgba(111, 205, 216, 1.00)",
                borderWidth: 1.5,
                pointBackgroundColor: "rgba(255, 255, 255)",
                pointRadius: 5,
                yAxisID: "adhd-y-axis"
            });
        }

        // sleepTimes - 수면시간 (bar 차트)
        if (getDisplay(moodchecker)) {
            datasets.push({
                type: "bar",
                label: "수면시간",
                data: sleepTimes,
                backgroundColor: "rgba(34, 92, 121, 1.00)",
                borderColor: "rgba(34, 92, 121, 1.00)",
                yAxisID: "sleepTimes-y-axis"
            });
        }
        return datasets;
    }

    function getyAxisID(moodchecker) {
        if (moodchecker == "mood") {
            return "mood-y-axis";
        } else if (moodchecker == "anxiety") {
            return "anxiety-y-axis";
        } else if (moodchecker == "adhd") {
            return "adhd-y-axis";
        }
    }

    function getyMin(moodchecker) {
        if (moodchecker == "mood") {
            return -4;
        } else {
            return 0;
        }
    }

    function getyMax(moodchecker) {
        if (moodchecker == "mood") {
            return 4;
        } else {
            return 10;
        }
    }

    function getSleepMin(moodchecker) {
        return moodchecker == "mood" ? -12 : 0;
    }

    function getDisplay(moodchecker) {
        return moodchecker === "adhd" ? false : true;
    }

    //Chart.js - 08.16
    let data = {
        labels: dates,
        datasets: setDatas(moodchecker)
    };

    let options = {
        animation: {
            animateScale: true
        },
        responsive: false,
        tooltips: {
            mode: 'index',
            intersect: false
        },
        scales: {
            xAxes: [{
                gridLines: {
                    display: false,
                    color: 'gray'
                },
                barThickness: 25 // 막대 그래프 폭
            }],
            yAxes:
                [
                    {
                        // 기분(line)차트의 y축 값 (왼쪽 표시)
                        type: "linear",
                        display: true,
                        position: "left",
                        id: getyAxisID(moodchecker),
                        ticks: {
                            max: getyMax(moodchecker),
                            min: getyMin(moodchecker),
                            beginAtZero: true,
                            callback: function (value) { //소수점 제거
                                if (value % 1 === 0) {
                                    return value;
                                }
                            }
                        },
                        gridLines: {
                            display: false,
                            color: 'gray'
                        },
                    },
                    {
                        // 수면시간(bar)차트의 y축 값 (오른쪽 표시)
                        type: "linear",
                        display: getDisplay(moodchecker),
                        position: "right",
                        id: "sleepTimes-y-axis",
                        ticks: {
                            max: 12,
                            min: getSleepMin(moodchecker),
                            stepSize: 2,
                            beginAtZero: true,
                            callback: function (value) { //소수점 제거
                                if (value % 1 === 0) {
                                    return value;
                                }
                            }
                        },
                        gridLines: {
                            display: false,
                            color: 'gray'
                        }
                    }
                ]
        },
        legend: {
            position: 'top',
            display: false,
            onHover: function (e) { // pointer 효과
                e.target.style.cursor = 'pointer';
            }
        },
        hover: { // pointer 효과
            onHover: function (e) {
                let point = this.getElementAtEvent(e);
                if (point.length) e.target.style.cursor = 'pointer';
                else e.target.style.cursor = 'default';
            }
        },
        annotation: { // 0점 기준선
            annotations: [{
                type: 'line',
                mode: 'horizontal',
                scaleID: getyAxisID(moodchecker),
                value: '0',
                borderColor: 'gray',
                borderWidth: 0.7
            }]
        }
    };

    new Chart(ctx, {
        type: "bar",
        data: data,
        options: options
    });

    $(".img-group").remove();
    for (let i in dates) {
        let lab = dates[i];
        let puted_date = 0.0;
        switch (dates.length) {
            case 28:
                puted_date = 1.15;
                break;
            case 30:
                puted_date = 1.2;
                break;
            case 31:
                puted_date = 1.225;
                break;
        }

        let img_width = $("#js-chart-moodchecker").width() / (dates.length + 1.225);
        let token_img_width = (img_width / 3) - 1;
        let $div = $("<div></div>").attr("id", "img-group-" + i).attr("class", "img-group").attr("style", "text-align:center; width:" + img_width + "px");
        let imgs = "";
        if (results[i].id > 0) {
            if (moodchecker == "mood") {
                if (results[i].suicide == 1) {
                    imgs += "<img id='" + lab + "' name='img' src='img/moodchecker/graph/" + moodchecker + "/ic_graph_suicide.png' style='width:" + token_img_width + "px; height:18px;' data-id='" + results[i].id + "' />";
                }

                if (results[i].period == 1) {
                    imgs += "<img id='" + lab + "' name='img' src='img/moodchecker/graph/" + moodchecker + "/ic_graph_period.png' style='width:" + token_img_width + "px; height:18px;' data-id='" + results[i].id + "' />";
                }
            } else if (moodchecker == "anxiety") {
                let panics = Object.values(JSON.parse(results[i].panic));
                if (results[i].medicine == 1) {
                    imgs += "<img id='" + lab + "' name='img' src='img/moodchecker/graph/" + moodchecker + "/ic_graph_prescription.png' style='cursor: pointer;width:" + token_img_width + "px;' data-id='" + results[i].id + "' />";
                }
                for (let j in panics) {
                    if (panics[j] == 1) {
                        imgs += "<img id='" + lab + "' name='img' src='img/moodchecker/graph/" + moodchecker + "/ic_graph_panic.png' style='cursor: pointer;width:" + token_img_width + "px;' data-id='" + results[i].id + "' />";
                        break;
                    }
                }
            } else if (moodchecker == "adhd") {
                let hyperactivitys = Object.values(JSON.parse(results[i].hyperactivity));
                let aggressions = Object.values(JSON.parse(results[i].aggression));
                let drug_side_effects = Object.values(JSON.parse(results[i].drug_side_effects));

                for (let j in hyperactivitys) {
                    if (hyperactivitys[j] == 1) {
                        imgs += "<img id='" + lab + "' name='img' src='img/moodchecker/graph/" + moodchecker + "/ic_graph_excess.png' style='cursor: pointer;width:" + token_img_width + "px;' data-id='" + results[i].id + "' />";
                        break;
                    }
                }
                for (let j in aggressions) {
                    if (aggressions[j] == 1) {
                        imgs += "<img id='" + lab + "' name='img' src='img/moodchecker/graph/" + moodchecker + "/ic_graph_attack.png' style='cursor: pointer;width:" + token_img_width + "px; height:18px;' data-id='" + results[i].id + "' />";
                        break;
                    }
                }
                for (let j in drug_side_effects) {
                    if (drug_side_effects[j] == 1) {
                        imgs += "<img id='" + lab + "' name='img' src='img/moodchecker/graph/" + moodchecker + "/ic_graph_drug.png' style='cursor: pointer;width:" + token_img_width + "px;' data-id='" + results[i].id + "' />";
                        break;
                    }
                }
            }
        }
        $div.append(imgs);
        $("#pics-in").append($div);
    }

    $("img[name='img']").on("click", function () {
        $(".modal-content").css("min-height", "");
        let id = $(this).attr("data-id");
        if (moodchecker.toLowerCase() == "mood") {
            return;
        }

        if (id > 0) {
            $.get(`/moodchecker/checkvalue/${moodchecker}/${id}`).done(function (data) {
                let texts = "";
                let result = data.result;

                /*util ENUM*/
                let panic = data.panic;
                let hyperactivity = data.hyperactivity;
                let aggression = data.aggression;
                let drug_side_effects = data.drug_side_effects;

                $("#dashboard-modal").show();
                if (moodchecker == "anxiety") {
                    let result_panic = JSON.parse(result.panic);
                    $("#dashboard-title").html($("<div></div>").text("Anxiety"));

                    texts += "<h4 class='panic-h4'>공황발작</h4>";
                    texts += "<ul id='panic'>";
                    texts += "</ul>";
                    $("#dashboard-body").html(texts);

                    $.each(result_panic, function (index, value) {
                        let text = panic[Object.keys(result_panic).indexOf(index)].TEXT.replace(/(\n)/g, "<br/>");
                        let desc = panic[Object.keys(result_panic).indexOf(index)].DESC;
                        if (value == 1) {
                            let html_text = "";
                            html_text += "<div class='panic-div'>";
                            html_text += "<img name='img' src='img/moodchecker/tap_anxiety/panic/" + index + ".png' width='70' height='70' />";
                            html_text += "<div class='panic-div-layer'>";
                            html_text += "<span>" + desc + "</span><br/>";
                            html_text += text;
                            html_text += "</div>";
                            html_text += "</div>";
                            $("#panic").append(html_text);
                        }
                    });

                    if ($("#panic div").length == 0) {
                        $("#panic").append("환자가 선택한 공황발작 요소가 없습니다.");
                    }
                } else if (moodchecker == "adhd") {
                    $(".modal-content").css("min-height", "300px");
                    let result_hyperactivity = JSON.parse(result.hyperactivity);
                    let result_aggression = JSON.parse(result.aggression);
                    let result_drug_side_effects = JSON.parse(result.drug_side_effects);
                    $("#dashboard-title").html($("<div></div>").text("ADHD"));

                    texts += "<div class='adhd-panel'>";
                    texts += "<h4 class='adhd-h4'>과잉행동 및 충동성</h4>";
                    texts += "<ul id='hyperactivity'>";
                    texts += "</ul>";
                    texts += "</div>";

                    texts += "<div class='adhd-panel'>";
                    texts += "<h4 class='adhd-h4'>공격적 행동</h4>";
                    texts += "<ul id='aggression'>";
                    texts += "</ul>";
                    texts += "</div>";

                    texts += "<div class='adhd-panel'>";
                    texts += "<h4 class='adhd-h4'>약물 부작용</h4>";
                    texts += "<ul id='drug_side_effects'>";
                    texts += "</ul>";
                    texts += "</div>";
                    $("#dashboard-body").html(texts);

                    $.each(result_hyperactivity, function (index, value) {
                        let text = hyperactivity[Object.keys(result_hyperactivity).indexOf(index)].DESC.replace(/(\n)/g, " ");
                        if (value == 1) {
                            let html_text = "";
                            html_text += "<div class='adhd-div-layer'>";
                            html_text += "<div class='adhd-div-img'><img name='img' src='img/moodchecker/tap_adhd/hyperactivity/" + index + ".png' width='70' height='70' /></div>";
                            html_text += "<div class='adhd-div-text'>";
                            html_text += text;
                            html_text += "</div>";
                            html_text += "</div>";
                            $("#hyperactivity").append(html_text);
                        }
                    });
                    if ($("#hyperactivity div").length == 0) {
                        $("#hyperactivity").append("환자가 선택한 과잉행동 및 충동성 요소가 없습니다.");
                    }

                    $.each(result_aggression, function (index, value) {
                        let text = aggression[Object.keys(result_aggression).indexOf(index)].DESC.replace(/(\n)/g, " ");
                        if (value == 1) {
                            var html_text = "";
                            html_text += "<div class='adhd-div-layer'>";
                            html_text += "<div class='adhd-div-img'><img name='img' src='img/moodchecker/tap_adhd/aggression/" + index + ".png' width='70' height='70' /></div>";
                            html_text += "<div class='adhd-div-text'>";
                            html_text += text;
                            html_text += "</div>";
                            html_text += "</div>";
                            $("#aggression").append(html_text);
                        }
                    });
                    if ($("#aggression div").length == 0) {
                        $("#aggression").append("환자가 선택한 공격적 행동 요소가 없습니다.");
                    }

                    $.each(result_drug_side_effects, function (index, value) {
                        let text = drug_side_effects[Object.keys(result_drug_side_effects).indexOf(index)].DESC.replace(/(\n)/g, " ");
                        if (value == 1) {
                            let html_text = "";
                            html_text += "<div class='adhd-div-layer'>";
                            html_text += "<div class='adhd-div-img'><img name='img' src='img/moodchecker/tap_adhd/drug_side_effects/" + index + ".png' width='70' height='70' /></div>";
                            html_text += "<div class='adhd-div-text'>";
                            html_text += text;
                            html_text += "</div>";
                            html_text += "</div>";
                            $("#drug_side_effects").append(html_text);
                        }
                    });
                    if ($("#drug_side_effects div").length == 0) {
                        $("#drug_side_effects").append("환자가 선택한 약물 부작용 요소가 없습니다.");
                    }
                }
                $("#dashboard-date").html("<div>" + moment(result.created_time).format("YYYY-MM-DD") + "</div>");
            }).fail(function () {
                alert("사용자의 선택정보를 불러오는중 오류가 발생하였습니다.");
                return;
            });
        }
    });
    setGraphDesc(moodchecker);
};

function setGraphDesc(moodchecker) {
    let image_html = "";
    if (moodchecker === "mood") {
        image_html += "<span style='margin-left: 10px;'><img width='15' height='15' style='margin-right:5px;' src='img/moodchecker/graph/mood/ic_guide_mood.png'>기분</span>";
        image_html += "<span style='margin-left: 10px;'><img width='15' height='15' style='margin-right:5px;' src='img/moodchecker/graph/mood/ic_guide_sleep.png'>수면시간</span>";
        image_html += "<span style='margin-left: 10px;'><img width='15' height='15' style='margin-right:5px;' src='img/moodchecker/graph/mood/ic_guide_suicide.png'>자살사고</span>";
        image_html += "<span style='margin-left: 10px;'><img width='13' height='15' style='margin-right:5px;' src='img/moodchecker/graph/mood/ic_guide_period.png'>월경</span>";
    } else if (moodchecker === "anxiety") {
        image_html += "<span style='margin-left: 10px;'><img width='15' height='15' style='margin-right:5px;' src='img/moodchecker/graph/anxiety/ic_guide_anxiety.png'>불안</span>";
        image_html += "<span style='margin-left: 10px;'><img width='15' height='15' style='margin-right:5px;' src='img/moodchecker/graph/anxiety/ic_guide_sleep.png'>수면시간</span>";
        image_html += "<span style='margin-left: 10px;'><img width='15' height='15' style='margin-right:5px;' src='img/moodchecker/graph/anxiety/ic_guide_panic.png'>공황발작</span>";
        image_html += "<span style='margin-left: 10px;'><img width='15' height='15' style='margin-right:5px;' src='img/moodchecker/graph/anxiety/ic_guide_prescription.png'>필요시 약물</span>";
    } else if (moodchecker === "adhd") {
        image_html += "<span style='margin-left: 10px;'><img width='15' height='15' style='margin-right:5px;' src='img/moodchecker/graph/adhd/ic_guide_attention.png'>주의력</span>";
        image_html += "<span style='margin-left: 10px;'><img width='15' height='15' style='margin-right:5px;' src='img/moodchecker/graph/adhd/ic_guide_excess.png'>과잉행동</span>";
        image_html += "<span style='margin-left: 10px;'><img width='15' height='15' style='margin-right:5px;' src='img/moodchecker/graph/adhd/ic_guide_attack.png'>공격적행동</span>";
        image_html += "<span style='margin-left: 10px;'><img width='15' height='15' style='margin-right:5px;' src='img/moodchecker/graph/adhd/ic_guide_drug.png'>약물 부작용</span>";
    }

    $("#graph-desc-block").html(image_html);
    $("#graph-desc-block").show();
}

function drawCommentsTable(results) {
    /* result 데이터를 테이블에 넣음 */
    let records = "";
    for (i = 0; i < results.length; i++) {
        let result = results[i];
        records +=
            "<tr class='record c-table__row'>" +
            "<td class='c-table__cell' for='date'>" +
            "<label class='lab_info'>" +
            result["created_time"] +
            "</label>" +
            "</td>" +
            "<td class='c-table__cell' for='comment'>" +
            "<label class='lab_info'>" +
            result["comment"] +
            "</label>" +
            "</td>" +
            "</tr>"
    }
    $("#mood-comments .record").remove();
    $(records).insertBefore("#mood-comments .empty-record");
}

function setEmptyResult(item, moodchecker) {
    let rtnEmptyResult = new Array();
    rtnEmptyResult.push({created_time: item});
    switch (moodchecker) {
        case "mood":
            rtnEmptyResult.push({mood: "empty"});
            break;
        case "anxiety":
            rtnEmptyResult.push({anxiety: "empty"});
            break;
        case "adhd":
            rtnEmptyResult.push({adhd: "empty"});
            break;
    }
    return rtnEmptyResult;
}

function getUrlVars() {
    let vars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    return vars;
}

function filterResultTableByScale(scaleName) {
    if (scaleName == "" || scaleName == null || typeof scaleName == typeof undefined) {
        $(".c-table .record").css("display", "")
        return;
    }
    $(".c-table .record").each(function (index, record) {
        let targetScaleName = $(record).find("label[for='scale-name']").text().toLowerCase();
        if (!targetScaleName.includes(scaleName)) {
            $(record).css("display", "none");
        } else {
            $(record).css("display", "");
        }
    });
};

function getCityInfo(lat, lon) {
    $.post("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + lon + "&key=AIzaSyAd6p6zUBj2IcCXX3lE2cDX9oWw00dpOrk").done(function (data) {
        let city = data["results"][0]["address_components"][1]["short_name"];
        getWeatherInfo(city, lat, lon);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log('error : ' + textStatus);
        console.log('error : ' + errorThrown);
        $weatherError.html("위치정보를 받아오는데 실패했습니다.");
    });
}

function getWeatherInfo(city, lat, lon) {
    $.post("http://api.openweathermap.org/data/2.5/weather?lat=" + lat + "&lon=" + lon + "&appid=116ad01da0f230f3f321133bd9790e1a&lang=kr&units=metric", "json"
    ).done(function (data) {
        let temp = Number((data["main"]["temp"]).toFixed(0));
        let weatherMain = data["weather"][0]["main"].toLowerCase();
        let weatherDesc = data["weather"][0]["description"];
        let humidity = data["main"]["humidity"] + "%";
        let tempMax = data["main"]["temp_max"] + "°";
        let wind = data["wind"]["speed"] + "MPH";

        let iconName = weatherIcon(weatherMain);
        $("#weather-icon").removeClass();
        $("#weather-icon").addClass("weather-icon wi " + iconName);
        $("#weather-text").html(weatherDesc);
        $("#weather-temp").html(temp + "˚C");
        $("#weather-location").html(city);
        $("#weather-error").html("");
        $("#weather-wind").html(wind);
        $("#weather-max-temp").html(tempMax);
        $("#weather-humidity").html(humidity);
    });
}

function weatherIcon(weatherMain) {
    let isDay = (moment().hour() <= 12);
    if (weatherMain == "cloud") {
        weatherMain = "cloudy";
    }
    if (isDay && weatherMain == "clear") {
        weatherMain = "sunny";
    }

    let iconName = weatherIconNames.filter(function (item) {
        return item.includes(weatherMain);
    }).filter(function (item) {
        return item.includes((isDay) ? "day" : "night");
    })[0];

    if (typeof iconName == typeof undefined) {
        iconName = "wi-day-cloudy-windy";
    }
    return iconName
}