// API Key for OpenWeatherMap.org
const API_KEY = '10c5503a14b71f3e79319a374b09b977';
// key for localStorage
const RECENT_CITIES_KEY = 'recent';

// initialize variables for UI elements
const citySearchForm           = document.getElementById('city-search-form');
const cityInput                = document.getElementById('city-input');
const cityHistoryPanel         = document.getElementById('city-history-panel');
const recentCitiesContainer    = document.getElementById('recent-cities-container');
const welcomeMessage           = document.getElementById('welcome-message');
const cityNotFoundMessage      = document.getElementById('city-not-found-message');
const cityNotFoundNameSpan     = document.getElementById('city-not-found-name');
const todaysWeatherContainer   = document.getElementById('todays-weather-container');
const fiveDayForecastContainer = document.getElementById('five-day-forecast-container');
const loadingModal             = document.getElementById('loading-modal');

// global state variables
let recentList = []; // list of recent cities;

function init() {
    // initialize page on load
    welcomeMessage.classList.remove('is-hidden');
    cityNotFoundMessage.classList.add('is-hidden');
    todaysWeatherContainer.classList.add('is-hidden');
    fiveDayForecastContainer.classList.add('is-hidden');
    citySearchForm.addEventListener('submit', searchForCityAndWeather);

    const recentListJSON = localStorage.getItem(RECENT_CITIES_KEY);
    if (recentListJSON) {
        recentList = JSON.parse(recentListJSON);
        showRecentCities();
    } else {
        cityHistoryPanel.classList.add('is-hidden');
    }

    recentCitiesContainer.addEventListener("click", showWeatherForRecentCity);
}

/**
 * Displays (and updates the display) of recent cities
 */
function showRecentCities () {
    // remove all children inside of the recent cities container div
    while (recentCitiesContainer.firstChild) {
        recentCitiesContainer.removeChild(recentCitiesContainer.firstChild);
    }

    // hide the section if there are no actual recent cities
    if (recentList.length === 0) {
        cityHistoryPanel.classList.add('is-hidden');
        return;
    }
    
    // otherwise, populate the list
    for (const cityName of recentList) {
        const cityButton = document.createElement('button');
        cityButton.className = 'panel-block button is-fullwidth';
        cityButton.textContent = cityName;
        recentCitiesContainer.appendChild(cityButton);
    }
    cityHistoryPanel.classList.remove('is-hidden');
}

/**
 * Callback function for form to search by the name of a city.
 * @param {Event} event 
 */
function searchForCityAndWeather(event) {
    event.preventDefault();
    loadingModal.classList.toggle('is-active');
    const cityName = cityInput.value;
    showWeatherForCity(cityName)
    .then(() => loadingModal.classList.toggle('is-active'));
}

/**
 * Callback function to bring up the weather for a city from on the recent cities list.
 * @param {Event} event 
 */
function showWeatherForRecentCity(event) {
    event.stopPropagation();
    loadingModal.classList.toggle('is-active');
    const cityName = event.target.textContent;
    showWeatherForCity(cityName)
    .then(() => loadingModal.classList.toggle('is-active'));
}


async function showWeatherForCity(cityName) {
    const coordinates = await getCoordinates(cityName);
    if (coordinates === null) {
        showNotFoundMessage(cityName);
        return;
    }
    const weather = await getWeather(coordinates.lat, coordinates.lon);
    showWeather(cityName, weather);
    addCityToRecentList(cityName);
}

/**
 * Adds cityName to recent cities list, moving it to the top of the
 * list if it is already present, updates the list in localStorage,
 * and updates the recent cities list on screen. 
 * @param {string} cityName 
 */
function addCityToRecentList(cityName) {
    // remove the city from the recent cities list if already present
    const prevIndex = recentList.indexOf(cityName);
    if (prevIndex !== -1) {
        recentList.splice(prevIndex, 1);
    }
    
    // add city to front of array and then truncate to length 10
    if (recentList.unshift(cityName) > 10) {
        recentList.splice(10);
    }

    // update local storage
    localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(recentList));

    // update display
    showRecentCities();
}

function showWeather(cityName, weather) {
    // make sure irrelevant messages are hidden
    welcomeMessage.classList.add('is-hidden');
    cityNotFoundMessage.classList.add('is-hidden');

    // populate current weather in UI
    const todaysWeatherCityName = document.getElementById('todays-weather-city-name');
    todaysWeatherCityName.textContent = cityName;
    const todaysWeatherDate = document.getElementById('todays-weather-date');
    todaysWeatherDate.textContent = getDateInTimezone(weather.current.dt, weather.timezone);
    
    const todaysTempSpan = document.querySelector('#todays-weather-container .temperature');
    todaysTempSpan.textContent = weather.current.temp;

    const todaysWindSpan = document.querySelector('#todays-weather-container .windspeed');
    todaysWindSpan.textContent = weather.current.wind_speed;

    const todaysHumiditySpan =  document.querySelector('#todays-weather-container .humidity');
    todaysHumiditySpan.textContent = weather.current.humidity;

    const todaysUVIndexSpan = document.querySelector('#todays-weather-container .uv-index');
    todaysUVIndexSpan.textContent = weather.current.uvi;
    todaysUVIndexSpan.classList.remove('uvi-low', 'uvi-moderate', 'uvi-high', 'uvi-very-high', 'uvi-extreme');
    if (weather.current.uvi < 3) {
        todaysUVIndexSpan.classList.add('uvi-low');
    } else if (weather.current.uvi < 6) {
        todaysUVIndexSpan.classList.add('uvi-moderate');
    } else if (weather.current.uvi < 8) {
        todaysUVIndexSpan.classList.add('uvi-high');
    } else if (weather.current.uvi < 11) {
        todaysUVIndexSpan.classList.add('uvi-very-high');
    } else {
        todaysUVIndexSpan.classList.add('uvi-extreme');
    }

    const todaysWeatherIcon = document.getElementById('todays-weather-icon');
    todaysWeatherIcon.setAttribute('src', `https://openweathermap.org/img/wn/${weather.current.weather[0].icon}.png`)

    // populate five-day forecast
    const dayForecastContentDivs = fiveDayForecastContainer.querySelectorAll('div.content'); 
    for (let i = 0; i < dayForecastContentDivs.length; i++) {
        const dateSpan = dayForecastContentDivs[i].querySelector('span.date');
        const weatherIcon = dayForecastContentDivs[i].querySelector('img');
        const tempSpan = dayForecastContentDivs[i].querySelector('span.temperature');
        const windSpan = dayForecastContentDivs[i].querySelector('span.windspeed');
        const humiditySpan = dayForecastContentDivs[i].querySelector('span.humidity');
        // note that the first item in weather.daily[] is the weather for the current day
        // skip that by always adding 1 to i
        dateSpan.textContent = getDateInTimezone(weather.daily[i+1].dt, weather.timezone);
        weatherIcon.setAttribute('src', `https://openweathermap.org/img/wn/${weather.daily[i+1].weather[0].icon}.png`)
        tempSpan.textContent = weather.daily[i+1].temp.day;
        windSpan.textContent = weather.daily[i+1].wind_speed;
        humiditySpan.textContent = weather.daily[i+1].humidity;
    }

    // TODO fix issue with first day of five day forecast being today

    todaysWeatherContainer.classList.remove('is-hidden');
    fiveDayForecastContainer.classList.remove('is-hidden');
}

/**
 * 
 * @param {int} timestamp - UTC time in seconds since UNIX epoch
 * @param {string} timezone 
 */
function getDateInTimezone(timestamp, timezone) {
    const dateInUTC = luxon.DateTime.fromSeconds(timestamp) // date in UTC
    const dateInTimezone = dateInUTC.setZone(timezone);
    return dateInTimezone.toISODate();
}

function showNotFoundMessage(cityName) {
    todaysWeatherContainer.classList.add('is-hidden');
    fiveDayForecastContainer.classList.add('is-hidden');
    welcomeMessage.classList.add('is-hidden');
    cityNotFoundNameSpan.textContent = cityName;
    cityNotFoundMessage.classList.remove('is-hidden');
}

async function getCoordinates(cityName) {
    const requestResult = await fetch(
        `http://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${API_KEY}`
    );

    const data = await requestResult.json();
    if (data.length > 0) {
        return {lat: data[0].lat, lon: data[0].lon};
    } else {
        return null;
    }
}

/**
 * Wrapper around online API call to openweathermap.org
 * @param {number} lat 
 * @param {number} lon 
 * @param {string} units - 'standard', 'metric', or 'imperial'. Defaults to 'metric'.
 * @param {string} lang  - Code for a supported language. Defaults to 'en'. See https://openweathermap.org/api/one-call-api#multi
 * @returns {Object}
 */
async function getWeather(lat, lon, units='metric', lang='en') {
    const requestResult = await fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}&lang=${lang}`)
    return await requestResult.json();
}

init();