#!/usr/bin/env node
var fetch = require('node-fetch');
var logEnabled = true;
if (process.argv.length < 4) {
    console.error("You must use the script like this: couchdb-undelete http://myurl:5984/db doc1");
    return process.exit(1);
}

function getRequestCfg() {
    return {
        mode: 'cors',
        method: 'GET',
        headers: {Accept: 'application/json'}
    };
}

function log(str) {
    if (logEnabled) {
        console.log(str);
    }
}


var url = process.argv[2];
var id = process.argv[3];
var currentRev = "";

fetch(url + "/" + id + "?revs=true&open_revs=all", getRequestCfg()).then(function (result) {
    return result.json();
}).then(function (json) {
    json = json[0].ok;
    log("Getting revisions:");
    log(json);
    log("");

    if (!json._deleted) {
        console.info("Document was not deleted :)");
        throw 'completed';
    }
    var prefix = (parseInt(json._revisions.start) - 1) + '-';

    if (json._revisions.ids.length < 2) {
        console.warn("We can't undelete. The document has been compacted.");
        throw 'completed';
    }
    var olderRev = prefix + json._revisions.ids[1];
    currentRev = json._rev;
    log("Current revision:\t " + currentRev);
    log("Previous revision:\t " + olderRev);
    return fetch(url + "/" + id + "?rev=" + olderRev, getRequestCfg());
}).then(function (result) {
    if (result.status === 404) {
        console.warn("We can't undelete. The document has been compacted.");
        throw 'completed';
    }
    return result.json();
}).then(function (json) {
    log("Previous document:");
    log(json);
    log("");

    //We undelete the document
    var httpCfg = getRequestCfg();
    httpCfg.headers['Content-type'] = 'application/json';
    httpCfg.method = 'PUT';

    //Remove revision as if we were creating a new document
    delete json._rev;
    httpCfg.body = JSON.stringify(json);
    return fetch(url + "/" + id, httpCfg);
}).then(function (result) {
    return result.json();
}).then(function (json) {
    console.info("Sucessfully undeleted the document");
}).catch(function (err) {
    if (err != 'completed') {
        log(err);
        console.error("An error occured");
        console.error(JSON.stringify(err));
    }
});
