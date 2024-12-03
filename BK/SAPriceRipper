javascript:(function() {
    const AIRPORT_CODES = {
        'Australia': { 'Sydney': 'SYD', 'Melbourne': 'MEL', 'Brisbane': 'BNE', 'Perth': 'PER' },
        'New Zealand': { 'Auckland': 'AKL' },
        'Japan': { 'Tokyo': 'HND', 'Osaka': 'KIX' },
        'Singapore': { 'Singapore': 'SIN' },
        'Italy': { 'Rome': 'FCO', 'Milan': 'MXP' },
        'France': { 'Paris': 'CDG' },
        'United Kingdom': { 'London': 'LHR' },
        'Germany': { 'Berlin': 'BER', 'Frankfurt': 'FRA' },
        'United States': { 'New York': 'JFK', 'Los Angeles': 'LAX', 'San Francisco': 'SFO' },
        'Canada': { 'Toronto': 'YYZ', 'Vancouver': 'YVR' },
        'United Arab Emirates': { 'Dubai': 'DXB' }
    };

    function downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function showAirportCodeReference() {
        console.log('--- Airport Code Reference ---');
        Object.entries(AIRPORT_CODES).forEach(([country, cities]) => {
            console.log(`${country}:`);
            Object.entries(cities).forEach(([city, code]) => {
                console.log(`  - ${city}: ${code}`);
            });
        });
        console.log('----------------------------');
    }

    async function fetchHistogram(originCode, destinationCode, date) {
        const body = JSON.stringify({
            "request": {
                "itineraryDetails": {
                    "originAirportCode": originCode,
                    "destinationAirportCode": destinationCode,
                    "departureDate": date
                },
                "cabinClass": "Y"
            }
        });

        try {
            const response = await fetch("https://www.singaporeair.com/flightsearch/getHistogram.form", {
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "content-type": "application/json"
                },
                "body": body,
                "method": "POST"
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return { date, data };
        } catch (error) {
            console.error(`Error fetching data for date ${date}:`, error);
            return { date, error: error.toString() };
        }
    }

    async function fetchMonthlyData(originCode, destinationCode, year) {
        const results = {};

        showAirportCodeReference();
        console.log(`Querying routes: ${originCode} → ${destinationCode}`);
        console.log(`Year: ${year}`);

        for (let month = 1; month <= 12; month++) {
            const dateString = `${year}-${month.toString().padStart(2, '0')}-01`;
            const result = await fetchHistogram(originCode, destinationCode, dateString);
            results[month] = result;

            console.log(`Results for ${dateString}:`, result);
        }

        downloadJSON(results, `singapore_airlines_${originCode}_to_${destinationCode}_${year}_monthly_histogram.json`);
        return results;
    }

    const originCode = prompt('Enter Origin Airport Code (e.g., MEL)', 'MEL');
    const destinationCode = prompt('Enter Destination Airport Code (e.g., MXP)', 'MXP');
    const year = parseInt(prompt('Enter Year (e.g., 2025)', '2025'));

    fetchMonthlyData(originCode, destinationCode, year).then(results => {
        console.log('Monthly data queried successfully');
    }).catch(error => {
        console.error('Error fetching monthly data:', error);
    });
})();




javascript:(function(){
  var text = document.documentElement.innerText;
  var jsonData = JSON.parse(text);
  var results = [];
  for (var month in jsonData) {
    if (jsonData[month].data && jsonData[month].data.histogramResponse && jsonData[month].data.histogramResponse.fares) {
      var fares = jsonData[month].data.histogramResponse.fares;
      fares.forEach(function(item) {
        results.push({date: item.departureDate, fare: item.fare});
      });
    }
  }
  results.sort(function(a, b) {
    return new Date(a.date) - new Date(b.date);
  });
  var output = results.map(function(item) {
    return `${item.date}: $${item.fare}`;
  });
  console.log(output);
})();
