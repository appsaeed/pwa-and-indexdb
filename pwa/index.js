/* 
 *service work js start point
 *----------------------------------------------------------
 *---------------------------------------------------------
 */


let localArray = [];

var srcNodeList = document.querySelectorAll('[src],[href]');
for (var i = 0; i < srcNodeList.length; ++i) {
    var item = srcNodeList[i];
    if (item.getAttribute('src') !== null) {
        localArray.push(item.getAttribute('src'));
    }
    if (item.getAttribute('href') !== null) {
        localArray.push(item.getAttribute('href'));
    }
}


async function registerSW() {
    if ('serviceWorker' in navigator) {
        //get message from sw.js
        // navigator.serviceWorker.addEventListener('message', event => {
        //   // event is a MessageEvent object
        //   console.log(`The service worker sent me a message: ${event.data}`);
        // });

        navigator.serviceWorker.ready.then(registration => {
            registration.active.postMessage(localArray);
        });

        try {
            await navigator.serviceWorker.register('sw.js');
        } catch (e) {
            console.log(`SW registration failed: ${e}`);
        }
    }
}




idb = {
    idbObject: null, // windows indexedDB object.
    idbtran: null, // windows transaction object.
    dbRequest: null, // db creation request.
    db: null, //database
    version: 1, // database version
    tables: null, // collection of object store.
    init: function (options) {
        if ('indexedDB' in window) {
            idb.idbObject = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
            idb.idbtran = window.IDBTransaction || window.webkitIDBTransaction;
            idb.tables = options.tables;

            var idbRequest = window.indexedDB.open(options.database, options.version); // open/create db with specific version
            idbRequest.onerror = function () {
                console.log("Error opening database.");
            };

            idbRequest.onsuccess = function (e) { // store success db object in order for curd.
                idb.db = this.result;
                idb.version = options.version;
            };
            idbRequest.onupgradeneeded = function (event) { // creation of object store first time on version change.
                var resultDb = event.target.result;
                idb.db = resultDb;
                var optionTables = idb.tables;


                //drop unwanted tables
                for (var i = 0; i < resultDb.objectStoreNames.length; i++) {
                    var needToDrop = true;
                    for (var j = 0; j < optionTables.length; j++) {
                        if (resultDb.objectStoreNames[i] == optionTables[j].name) {
                            needToDrop = false;
                            break;
                        }
                    }
                    if (needToDrop) {
                        idb.db.deleteObjectStore(resultDb.objectStoreNames[i]);
                    }
                }


                //create new tables
                for (var i = 0; i < optionTables.length; i++) {
                    if (!resultDb.objectStoreNames.contains(optionTables[i].name)) {
                        var objectStore = resultDb.createObjectStore(optionTables[i].name, { keyPath: optionTables[i].keyPath, autoIncrement: optionTables[i].autoIncrement });
                        console.log(optionTables[i].name + " Created.");
                        if (optionTables[i].index != null && optionTables[i].index != 'undefined') {
                            for (var idx = 0; idx < optionTables[i].index.length; idx++) {
                                objectStore.createIndex(optionTables[i].index[idx].name, optionTables[i].index[idx].name, { unique: optionTables[i].index[idx].unique });
                            }
                        }
                    }
                }





            }
        }
        else {
            console.log("This browser doesn't support IndexedDB");
        }
    },
    insert: function (table, data, callback = null) {
        var db = idb.db;

        var isTableExists = false;
        for (var i = 0; i < idb.tables.length; i++) {
            if (idb.tables[i].name == table) {
                isTableExists = true;
                break;
            }
        }

        if (!isTableExists) {
            if (callback && typeof (callback) === "function") {
                callback(false, table + " Table not found.");
            }
        }
        else {
            var tx = db.transaction(table, "readwrite");
            var store = tx.objectStore(table);


            var dataLength = 1;
            if (data.constructor === Array) {
                dataLength = data.length;
                for (var i = 0; i < dataLength; i++) {
                    store.put(data[i]);
                }
            }
            else {
                store.put(data);
            }

            tx.oncomplete = function () {
                if (callback && typeof (callback) === "function") {
                    callback(true, "" + dataLength + " records inserted.");
                }
            };

        }
    },
    delete: function (table, key, callback) {
        var db = idb.db;

        var isTableExists = false;
        for (var i = 0; i < idb.tables.length; i++) {
            if (idb.tables[i].name == table) {
                isTableExists = true;
                break;
            }
        }

        if (!isTableExists) {
            if (callback && typeof (callback) === "function") {
                callback(false, table + " Table not found.");
            }
        }
        else {



            var tx = db.transaction(table, "readwrite");
            var store = tx.objectStore(table);

            var keyLength = -1;
            if (key && typeof (key) === "function") {
                store.clear();
            }
            else {
                if (key.constructor === Array) {
                    keyLength = key.length
                    for (var i = 0; i < keyLength; i++) {
                        store.delete(key[i]);
                    }
                }
                else {
                    keyLength = 1;
                    store.delete(key);
                }
            }


            tx.oncomplete = function (event) {
                //if all argument available
                if (callback && typeof (callback) === "function") {
                    callback(true, "" + keyLength == -1 ? "All" : keyLength + " records deleted.");
                }

                //if only two argument available
                if (key && typeof (key) === "function") {
                    key(true, "" + (keyLength == -1 ? "All" : keyLength) + " records deleted.");
                }
            };

            tx.onerror = function () {
                if (callback && typeof (callback) === "function") {
                    callback(false, tx.error);
                }
            };
        }
    },
    select: function (table, key, callback) {
        var db = idb.db;

        var isTableExists = false;
        for (var i = 0; i < idb.tables.length; i++) {
            if (idb.tables[i].name == table) {
                isTableExists = true;
                break;
            }
        }

        if (!isTableExists) {
            if (callback && typeof (callback) === "function") {
                callback(false, table + " Table not found.");
            }
        }
        else {

            var tx = db.transaction(table, "readonly");
            var store = tx.objectStore(table);
            var request;
            var keyLength = -1;
            var data;
            if (key && typeof (key) === "function") {
                request = store.getAll();
            }
            else if (key.constructor === Array) {
                keyLength = key.length
                request = store.getAll();
            }
            else if (key && typeof key === 'object' && key.constructor === Object) {
                keyLength = 1
                var index = store.index(key.key);
                request = index.getAll(key.value);
            }
            else {
                keyLength = 1;
                request = store.get(key);
            }


            tx.oncomplete = function (event) {
                //if all argument available
                var result = request.result;
                var keypath = request.source.keyPath;
                var filteredResult = [];

                //if need to filter key array
                if (keyLength > 1) {
                    for (var i = 0; i < result.length; i++) {
                        for (var j = 0; j < keyLength; j++) {
                            if (result[i][keypath] == key[j]) {
                                filteredResult.push(result[i]);
                                break;
                            }
                        }
                    }
                    result = filteredResult;
                }


                if (callback && typeof (callback) === "function") {
                    callback(true, result);

                }

                //if only two argument available
                if (key && typeof (key) === "function") {
                    key(true, request.result);
                }
            }

            tx.onerror = function () {
                if (callback && typeof (callback) === "function") {
                    callback(false, request.error);
                }
            };
        }
    },
};















//init index db class
idb.init({
    database: "fish_db",
    version: 1,
    tables: [
        {
            name: "fish_table",
            keyPath: "id",
            autoIncrement: true,
            index: [{ name: "form_data", unique: false }]
        }
    ]
});

///serilize indexdb table form data function serilize ot json
function queryStringToJSON(qs) {
    qs = qs || location.search.slice(1);

    var pairs = qs.split('&');
    var result = {};
    pairs.forEach(function (p) {
        var pair = p.split('=');
        var key = pair[0];
        var value = decodeURIComponent(pair[1] || '');

        if (result[key]) {
            if (Object.prototype.toString.call(result[key]) === '[object Array]') {
                result[key].push(value);
            } else {
                result[key] = [result[key], value];
            }
        } else {
            result[key] = value;
        }
    });

    return JSON.parse(JSON.stringify(result));
};

//this function for ganareate serialize form data with vanila javascript
function as_serialize(form) {
    var field, s = [];
    if (typeof form == 'object' && form.nodeName == "FORM") {
        var len = form.elements.length;
        for (i = 0; i < len; i++) {
            field = form.elements[i];
            if (field.name && !field.disabled && field.type != 'file' && field.type != 'reset' && field.type != 'submit' && field.type != 'button') {
                if (field.type == 'select-multiple') {
                    for (j = form.elements[i].options.length - 1; j >= 0; j--) {
                        if (field.options[j].selected)
                            s[s.length] = encodeURIComponent(field.name) + "=" + encodeURIComponent(field.options[j].value);
                    }
                } else if ((field.type != 'checkbox' && field.type != 'radio') || field.checked) {
                    s[s.length] = encodeURIComponent(field.name) + "=" + encodeURIComponent(field.value);
                }
            }
        }
    }
    return s.join('&').replace(/%20/g, '+');
}



///config global variable
var saveNcreate = document.querySelector('#saveNcreate');
var cacheSave = document.querySelector('#save');
var formelm = document.querySelector('#mm_fangs');
var siteurl = "https://faenger.naturparkhirschwald.de/";


window.addEventListener('DOMContentLoaded', () => {

    registerSW();

    if (navigator.onLine == false) {

        function sendformdata(formelm) {
            if (formelm != null) {
                formelm.onsubmit = () => false;
                let posturl = siteurl + 'neue-faenge-melden.html';
                const instdata = as_serialize(formelm);
                const timestamp = new Date();
                idb.insert("fish_table", { form_data: instdata, posturl: posturl, time: timestamp }, function (isInserted, responseText) {
                    if (isInserted) {
                        const inpall = document.querySelectorAll('input, textarea, select');
                        for (let i = 0; i < inpall.length; i++) {
                            inpall[i].value = '';
                        }
                    }
                });
            } else {
                alert("Could't find form " + formelm);
            }
        }


        if (cacheSave != null) {
            cacheSave.addEventListener('click', () => { sendformdata(formelm) });
        }
        if (saveNcreate != null) {
            saveNcreate.addEventListener('click', () => { sendformdata(formelm) });
        }


        if (document.querySelector('table tbody') != null) {

            setTimeout(() => {
                var result = idb.select("fish_table", [], function (isSelected, responseData) {
                    if (isSelected) {

                        let tablehtml = '';

                        if (responseData.length != 0) {

                            for (let i = 0; i < responseData.length; i++) {
                                var res = queryStringToJSON(responseData[i].form_data);
                                tablehtml += `<tr>
                                            <td></td>
                                            <td>${res.date_fang}</td>
                                            <td>${res.section} Schmidmühlen</td>
                                            <td>${res.count_crab_steinkrebse}</td>
                                            <td>${res.count_crab_signalkrebse}</td>
                                            <td>${res.count_traps}</td>
                                            <td>${res.count_crab_gal_sumpfkrebse}</td>
                                            <td>${res.count_crab_edelkrebse}</td>
                                        </tr>
                                    `;


                            }
                            document.querySelector('table tbody').insertAdjacentHTML('beforeend', tablehtml);;
                        }

                    }
                    else {
                        console.log("Error: " + responseText);
                    }
                });
            }, 3000);
        }

    }



    if (navigator.onLine == true) {
        setTimeout(() => {
            idb.select("fish_table", [], function (isSelected, responseData) {
                if (isSelected) {
                    if (responseData.length != 0) {
                        for (let i = 0; i < responseData.length; i++) {
                            const formdata = responseData[i].form_data;
                            const sendurl = responseData[i].posturl;
                            console.log(formdata);
                            var xhr = new XMLHttpRequest();
                            xhr.onreadystatechange = function () {
                                if (this.readyState != 4) return;

                                if (this.status == 200) {

                                    var result = idb.delete("indexdb fish_table::", [], function (isDeleted, responseText) {
                                        if (isDeleted) {
                                            console.log(responseText);
                                        }
                                        else {
                                            console.log("indexdb Error: " + responseText);
                                        }
                                    });
                                }
                            };

                            xhr.open("POST", siteurl, true);
                            xhr.send(formdata);

                        }
                    }
                }
            });
        }, 2000);
    }
});
