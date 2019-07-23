const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const uniqueRandomArray = require('unique-random-array');
const app = express();

app.use(bodyParser.json());

const currencyConvertHost = "https://data.fixer.io/api/latest?";
const jokeapi = 'http://api.laifudao.com/open/xiaohua.json';
const wikiPediaApiHost = 'https://en.wikipedia.org/w/api.php?'; //https://www.mediawiki.org/wiki/API:Opensearch

app.get('/dummyget', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'speech': 'dummy speech', 'displayText': 'dummy get works!' }));
});


app.post('/webhook', function (req, res) {

    if (req.body.result.parameters['Bored']) {
        callJoke()
            .then((output) => {
                const randomJoke = uniqueRandomArray(output);
                const joke = randomJoke().content;
                let result = toApiAiResponseMessage(joke, joke, toTelgramObject(joke, 'Markdown'));
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(result));
            })
            .catch(errorHandler);
    }
    else if (req.body.result.parameters['currency-from']) {
        var currencyFrom = req.body.result.parameters['currency-from'];
        var currencyTo;
        if(!req.body.result.parameters['currency-to']){
            currencyTo = 'USD';
        }
        else {
            currencyTo = req.body.result.parameters['currency-to'];
        }
        var number = 1.0;
        if (req.body.result.parameters['number']) {
            number = parseFloat(req.body.result.parameters['number']);
            if (number <= 0) {
                number = 1.0;
            }
        }
        callFixerIo(currencyFrom, currencyTo)
            .then((output) => {
                let resultText = Array();
                currencyTo.forEach(function (cur) {
                    var toNumber = number * parseFloat(output.rates[cur.toUpperCase()]);
                    toNumber = toNumber.toFixed(3);
                    resultText.push(`${number} ${output.base} = ${toNumber} ${cur}`);
                }, this);

                let displayText = resultText.join();
                let result = toApiAiResponseMessage(displayText, displayText, toTelgramObject(resultText.join('\n'), 'Markdown'));
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(result));
            });
    }
    else if (req.body.result.parameters['wikiItem']) {
        var searchTerm = req.body.result.parameters['wikiItem'];
        callWikiPediaApi(searchTerm)
            .then((output) => {
                let displayText = `Nothing Found for: ${searchTerm}`;
                let result;
                if (output && output[0]) {
                    displayText = `我翻了翻，看看我找到了啥吧 ${output[1][0]}: ${output[2][0]}`;
                    let telegramText = htmlEntities(`我翻了翻，看看我找到了啥吧 *${output[1][0]}*: ${output[2][0]} \n\n 查看更多： [WikiPedia](${output[3][0]})`);
                    result = toApiAiResponseMessage(displayText, displayText, toTelgramObject(telegramText, 'Markdown'));
                }
                res.setHeader('Content-Type', 'application/json');
                if (result) {
                    res.send(JSON.stringify(result));
                }
                else {
                    res.send(JSON.stringify(displayText));
                }
            });
    }
    else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ 'speech': "No Proper hook found", 'displayText': "No Proper hook found" }));
    }
});

function callFixerIo(currencyFrom, currencyTo) {
    return new Promise((resolve, reject) => {
        currencyTo = currencyTo.join().toUpperCase();
        let url = `${currencyConvertHost}base=${currencyFrom}&symbols=${currencyTo}`;
        http.get(url, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                let jO = JSON.parse(body);
                resolve(jO);
            });

            res.on('error', (error) => {
                reject(error);
            });
        });
    });
}

function callJoke() {
    return new Promise((resolve, reject) => {
        https.get(jokeapi, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                let jO = JSON.parse(body);
                resolve(jO);
            });

            res.on('error', (error) => {
                reject(error);
            });
        });
    });
}

function callWikiPediaApi(searchTerm, format = "json", action = "opensearch", limit = 2, profile = "fuzzy") {
    return new Promise((resolve, reject) => {
        let url = `${wikiPediaApiHost}&format=${format}&action=${action}&limit=${limit}&profile=${profile}&search=${searchTerm}`;
        https.get(url, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                let jO = JSON.parse(body);
                resolve(jO);
            });
            res.on('error', (error) => {
                reject(error);
            });
        });
    });
}


function toTelgramObject(text, parse_mode) {
    return {
        text: text,
        parse_mode: parse_mode
    }
}

function toApiAiResponseMessage(speech, displayText, telegramObject = null) {
    return {
        speech: speech,
        displayText: displayText,
        data: {
            telegram: telegramObject
        }
    }
}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function errorHandler(error) {
    console.log(error);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(toApiAiResponseMessage(error, error, toTelgramObject(error, 'Markdown'))));
}

app.listen((process.env.PORT || 5000), function () {
    console.log("Server listening");
});
