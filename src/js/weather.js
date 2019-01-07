let weatherIconNames = ["wi-day-sunny", "wi-day-cloudy", "wi-day-cloudy-gusts", "wi-day-cloudy-windy", "wi-day-fog", "wi-day-hail", "wi-day-haze", "wi-day-lightning", "wi-day-rain",
    "wi-day-rain-mix", "wi-day-rain-wind", "wi-day-showers", "wi-day-sleet", "wi-day-sleet-storm", "wi-day-snow", "wi-day-snow-thunderstorm", "wi-day-snow-wind", "wi-day-sprinkle",
    "wi-day-storm-showers", "wi-day-sunny-overcast", "wi-day-thunderstorm", "wi-day-windy", "wi-solar-eclipse", "wi-hot", "wi-day-cloudy-high", "wi-day-light-wind", "wi-night-clear",
    "wi-night-alt-cloudy", "wi-night-alt-cloudy-gusts", "wi-night-alt-cloudy-windy", "wi-night-alt-hail", "wi-night-alt-lightning", "wi-night-alt-rain", "wi-night-alt-rain-mix",
    "wi-night-alt-rain-wind", "wi-night-alt-showers", "wi-night-alt-sleet", "wi-night-alt-sleet-storm", "wi-night-alt-snow", "wi-night-alt-snow-thunderstorm", "wi-night-alt-snow-wind",
    "wi-night-alt-sprinkle", "wi-night-alt-storm-showers", "wi-night-alt-thunderstorm", "wi-night-cloudy", "wi-night-cloudy-gusts", "wi-night-cloudy-windy", "wi-night-fog", "wi-night-hail",
    "wi-night-lightning", "wi-night-partly-cloudy", "wi-night-rain", "wi-night-rain-mix", "wi-night-rain-wind", "wi-night-showers", "wi-night-sleet", "wi-night-sleet-storm", "wi-night-snow",
    "wi-night-snow-thunderstorm", "wi-night-snow-wind", "wi-night-sprinkle", "wi-night-storm-showers", "wi-night-thunderstorm", "wi-lunar-eclipse", "wi-stars", "wi-storm-showers", "wi-thunderstorm",
    "wi-night-alt-cloudy-high", "wi-night-cloudy-high", "wi-night-alt-partly-cloudy"];

    let $weatherError = $("#weather-error");

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