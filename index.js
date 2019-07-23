
const functions = require('firebase-functions');
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const uniqueRandomArray = require('unique-random-array');
const app = express();
// Import the appropriate class
const currencyConvertHost = "https://data.fixer.io/api/latest?access_key=6257cba0a2109738cb067e097b3c6f0b&";
const jokeapi = 'http://api.laifudao.com/open/xiaohua.json';
const wikiPediaApiHost = 'https://en.wikipedia.org/w/api.php?'; //https://www.mediawiki.org/wiki/API:Opensearch

const { WebhookClient } = require('dialogflow-fulfillment');
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
    var wikiSearch = async agent => {
        var searchTerm = agent.parameters.wikiItem;
        var output = await callWikiPediaApi(searchTerm);
        let displayText = `关于 ${searchTerm} 好像没有啥特别值得介绍的，改天再找我吧。`;
        if (output && output[0]) {
            displayText = `我翻了翻，看看我找到了啥吧 ${output[1][0]}: ${output[2][0]}`;
        }
        agent.add(displayText);
    }
    var getJoke = async agent => {
        var output = await callJoke();
        const randomJoke = uniqueRandomArray(output);
        const joke = randomJoke().content;
        agent.add(joke);
    }
  
    let intentMap = new Map(); // Map functions to Dialogflow intent names
    intentMap.set('wiki.search', wikiSearch);
    intentMap.set('joke.query', getJoke);
    agent.handleRequest(intentMap);
});


app.use(bodyParser.json());

app.get('/dummyget', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'speech': 'dummy speech', 'displayText': 'dummy get works!' }));
});

var callJoke = () => {
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

var callWikiPediaApi = (searchTerm, format = "json", action = "opensearch", limit = 2, profile = "fuzzy") => {
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


app.listen((process.env.PORT || 5000), function () {
    console.log("Server listening");
});
