const fs = require('fs');
const util = require('util');

const readFile = util.promisify(fs.readFile);

const path = "./docs/routes/";
const destPath = "./docs/Schedules/";
const linePath = "./docs/Lines/";

let Line = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
    7: null
};

readDirOfLines();

function readDirOfLines() {

    fs.readdir(linePath, function (err, items) {

        for (let i = 0; i < items.length; i++) {
            saveLineInfoInArray(items[i]);
        }
    });
    readStationInfoFile();
}

function saveLineInfoInArray(fileName) {

    async function getJsonFile() {
        return await readFile(linePath + fileName);
    }

    getJsonFile().then(jsonData => {
        save(JSON.parse(jsonData), fileName);
    });

    function save(jsonData, fileName) {
        fileName = fileName.replace('.json', '');
        switch (fileName) {
            case "RoundLine":
                Line["1"] = jsonData;
                break;
            case "CoastLine":
                Line["2"] = jsonData;
                break;
            case "PingxiLine":
                Line["3"] = jsonData;
                break;
            case "NiewanLiujaLine":
                Line["4"] = jsonData;
                break;
            case "NiewanLine":
                Line["5"] = jsonData;
                break;
            case "JijiLine":
                Line["6"] = jsonData;
                break;
            case "ShalunLine":
                Line["7"] = jsonData;
                break;
        }
    }
}

function readStationInfoFile() {

    async function getJsonFile() {
        return await readFile("./docs/stationInfo.json");
    }

    getJsonFile().then(stationInfo => {
        readDir(JSON.parse(stationInfo));
    });
}

function readDir(stationInfo) {

    fs.readdir(path, function (err, items) {

        for (let i = 0; i < items.length; i++) {
            readJsonFile(items[i], stationInfo);
        }

        setTimeout(addRoutesToStationFromSpecialRoutes, 15000);
    });
}

function readJsonFile(fileName, stationInfo) {

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    async function getJsonFile() {
        return await readFile(path + fileName);
    }

    getJsonFile().then(jsonData => {
        alternateData(JSON.parse(jsonData));
    });

    function alternateData(fileData) {
        fileData.TrainInfos.map(function (el) {
            el.StartStation = parseInt(el.TimeInfos[0].Station);
            el.StartTime = el.TimeInfos[0].DepTime;
            el.EndStation = parseInt(el.TimeInfos[el.TimeInfos.length - 1].Station);
            el.EndTime = el.TimeInfos[el.TimeInfos.length - 1].DepTime;
            el.Stations = {};
            el.Routes = [];
            let MiddleStation = el.TimeInfos[Math.round((el.TimeInfos.length - 1) / 2)].Station;
            let newTimeInfo = {};
            el.TimeInfos.forEach(function (tel, index) {
                let routes = stationInfo.stations.find((sel => sel.時刻表編號 === parseInt(tel.Station))).routeCode;
                el.Routes = el.Routes.concat(routes);
                newTimeInfo[tel.Station] = {
                    "Station": tel.Station,
                    "Order": tel.Order,
                    "DepTime": tel.DepTime,
                    "ArrTime": tel.ArrTime,
                    "Routes": routes
                };
                // el.Stations[parseInt(tel.Station)] = {
                //     "routeCode": routes,
                //     "index": index
                // };
            });
            el.TimeInfos = newTimeInfo;
            el.Routes = el.Routes.filter(onlyUnique);
            el.mainRoute = getMainRoute(el.StartStation, el.EndStation, el, MiddleStation);
            el.MultiRoute = el.Routes.length !== 1;
            return el;
        });
        exportNewData(JSON.stringify(fileData));
        exportSpecialLines();
    }

    function exportNewData(newData) {
        fs.writeFile(destPath + fileName, newData, err => {
            if (err) {
                console.log('Error writing file', err)
            } else {
                console.log('Successfully wrote file')
            }
        })
    }

    let Specials = 0;
    let special = [];

    function getMainRoute(startStation, endStation, el, MiddleStation) {
        let startNumbers = getRouteNumbers(startStation);
        let endNumbers = getRouteNumbers(endStation);
        if (startNumbers[0] === endNumbers[0]) {
            let startStationCode = getTraWebsiteCode(startStation);
            let endStationCode = getTraWebsiteCode(endStation);
            let middleStationCode = getTraWebsiteCode(MiddleStation);
            if (startStationCode < endStationCode && startStationCode < middleStationCode) {
                if (startNumbers[0] === 4 && endNumbers[0] === 4) {
                    return startNumbers[1];
                } else {
                    return startNumbers[0];
                }
            } else {
                if (startNumbers[0] === 4 && endNumbers[0] === 4) {
                    return "-" + startNumbers[1];
                } else {
                    return "-" + startNumbers[0];
                }
            }
        } else {
            if (startNumbers.length === 2 && endNumbers.length === 2) {
                if (startNumbers[1] === endNumbers[0]) {
                    return endNumbers[1];
                } else {
                    return "-" + endNumbers[0];
                }
            } else {
                if (startNumbers.length === 2 && endNumbers.length === 1) {
                    return endNumbers[0];
                } else {
                    if (startNumbers.length === 1 && endNumbers.length === 2) {
                        return "-" + endNumbers[0];
                    } else {
                        if (startNumbers.length === 3 || endNumbers.length === 3) {
                            if (startNumbers.length === 2) {
                                return endNumbers[0];
                            } else {
                                return "-" + startNumbers[0];
                            }
                        } else {
                            Specials++;
                            special.push({
                                startStation: startStation,
                                endStation: endStation,
                                startNumbers: startNumbers,
                                endNumbers: endNumbers,
                                route: ObjectLength(el.TimeInfos),
                                details: el
                            });
                            if (startNumbers[0] === 1) {
                                return endNumbers[0];
                            } else {
                                return startNumbers[0];
                            }
                        }
                        // console.log("startNumbers", startNumbers, startNumbers.length, startStation);
                        // console.log("endNumbers", endNumbers, endNumbers.length, endStation);
                        // console.log("Specials");
                        // console.log("startNumbers", startNumbers, startNumbers.length, startStation);
                        // console.log("endNumbers", endNumbers, endNumbers.length, endStation);
                    }
                }
            }
        }
    }

    function ObjectLength(object) {
        let length = 0;
        for (let key in object) {
            if (object.hasOwnProperty(key)) {
                ++length;
            }
        }
        return length;
    };

    function getRouteNumbers(station) {
        return findRightStation(station).routeCode;
    }

    function getTraWebsiteCode(station) {
        return parseInt(findRightStation(station).traWebsiteCode);
    }

    function findRightStation(station) {
        return stationInfo.stations.find((sel => sel.時刻表編號 === parseInt(station)))
    }

    function exportSpecialLines() {
        console.log("!!!!!!!!!!!!!!!!!!!!Specials!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.log("Specials", Specials);
        special = unique(special, ['endStation', 'startStation', 'route']);
        let object = {
            lenght: ObjectLength(special),
            special: special
        };
        fs.writeFile(linePath + "specials.json", JSON.stringify(object), err => {
            if (err) {
                console.log('Error writing file', err)
            } else {
                console.log('Successfully wrote file')
            }
        })
    }

    function unique(arr, keyProps) {
        const kvArray = arr.map(entry => {
            const key = keyProps.map(k => entry[k]).join('|');
            return [key, entry];
        });
        const map = new Map(kvArray);
        return Array.from(map.values());
    }
}

function addRoutesToStationFromSpecialRoutes() {

    console.log("Read to do special line");
    readSpecialRoute();

    function readSpecialRoute() {

        async function getJsonFile() {
            return await readFile("./docs/Lines/specials.json");
        }

        getJsonFile().then(specialInfo => {
            updateRouteList(JSON.parse(specialInfo));
        })
    }

    function updateRouteList(specialInfo) {
        if (specialInfo.lenght === 0) {
            console.log("We're done")
        } else {
            readStationInfoFile(specialInfo);
        }
    }

    function readStationInfoFile(specialInfo) {

        async function getJsonFile() {
            return await readFile("./docs/stationInfo.json");
        }

        getJsonFile().then(stationInfo => {
            changeStationInfo(JSON.parse(stationInfo), specialInfo);
        })
    }

    function changeStationInfo(stationInfo, specialInfo) {
        specialInfo.special.forEach(function (el) {
            Object.keys(el.details.TimeInfos).forEach(function (key) {
                let station = stationInfo.stations.find((sel => sel.時刻表編號 === parseInt(key))).routeCode;
                if (!(station.includes(el.details.mainRoute))) {
                    station.push(el.details.mainRoute);
                }
            })
        });
        exportChangedStationInfo(JSON.stringify(stationInfo));
    }

    function exportChangedStationInfo(newData) {
        fs.writeFile("./docs/stationInfo.json", newData, err => {
            if (err) {
                console.log('Error writing file', err)
            } else {
                console.log('Successfully wrote file')
            }
        });
        readDirOfLines();
    }
}