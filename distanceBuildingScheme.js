const fs = require('fs');
const util = require('util');
const moment = require('moment');

const readFile = util.promisify(fs.readFile);

// changeFareDetails();

function changeFareDetails() {

    async function getJsonFile() {
        return await readFile("WK-fare.json");
    }


    async function getStationInfo() {
        return await readFile("./docs/stationInfo.json");
    }

    getJsonFile().then(fareDetails => {
        getStationInfo().then(StationDetails => {
            handleData(JSON.parse(StationDetails), JSON.parse(fareDetails))
        });
    });

    function handleData(StationDetails, fareDetails) {
        let newData = {};
        let mandarinCode = null;
        let currentNode = null;
        for (let i = 0; i < fareDetails.length; i++) {
            if (currentNode === null || currentNode !== fareDetails[i].startStaCode) {
                if (fareDetails[i].startStaCode !== "1001") {
                    currentNode = fareDetails[i].startStaCode;
                    mandarinCode = findRightCodeForTRaWebsiteCode(StationDetails, currentNode);
                    newData[mandarinCode] = [];
                }
            }
            let endCode = fareDetails[i].endStaCode;
            if (endCode !== "1001") {
                newData[mandarinCode].push({
                    endStaCode: findRightCodeForTRaWebsiteCode(StationDetails, fareDetails[i].endStaCode),
                    mileage: fareDetails[i].mileage
                })
            }
        }

        exportNewData('distance.json', JSON.stringify(makeUnique(newData)));
    }

    function makeUnique(newData) {
        Object.keys(newData).forEach(function ($el) {
            newData[$el] = (Object.values(newData[$el].reduce((unique, o) => {
                if (!unique[o.endStaCode] || +o.mileage < +unique[o.endStaCode].mileage) unique[o.endStaCode] = o;

                return unique;
            }, {})));
        });
        return modifyFareList(newData);
    }

    function modifyFareList(fareData) {
        fareData = Object.keys(fareData).map(function (el) {
            let newObject = {};
            fareData[el].forEach(function (element) {
                newObject[element.endStaCode] = {mileage: element.mileage};
            });
            return {[el]: newObject};
        });
        let newFareDetails = {};
        Object.keys(fareData).forEach(function (el) {
            newFareDetails[Object.keys(fareData[el])[0]] = fareData[el][Object.keys(fareData[el])[0]];
        });
        return newFareDetails;
    }

    function findRightCodeForTRaWebsiteCode(StationDetails, traWebsiteCode) {
        return StationDetails.stations.find((el => el.traWebsiteCode === traWebsiteCode)).時刻表編號;
    }
}

createNewDistanceFiles();

function createNewDistanceFiles() {

    async function getJsonFile() {
        return await readFile("distance.json");
    }


    async function getStationInfo() {
        return await readFile("./docs/stationInfo.json");
    }

    getJsonFile().then(distanceDetails => {
        getStationInfo().then(StationDetails => {
            handleData(JSON.parse(StationDetails), JSON.parse(distanceDetails))
        });
    });

    function handleData(StationDetails, distanceDetails) {
        Object.keys(distanceDetails).forEach(function (el) {
            let distanceDetail = distanceDetails[el];
            Object.keys(distanceDetail).map(function (element) {
                let travelElement = StationDetails.stations.find((value => parseInt(value.時刻表編號) === parseInt(element)));
                distanceDetail[element].gradeStation = {
                    status: travelElement.gradeStation.status,
                    value: travelElement.gradeStation.value
                };
                distanceDetail[element].stops = travelElement.stops;
                return distanceDetail;
            });
            exportNewData('distance/'+ el +'.json', JSON.stringify(distanceDetails[el]));
        });
    }

}


function exportNewData(path, newData) {
    fs.writeFile((path), newData, err => {
        if (err) {
            console.log('Error writing file', err)
        } else {
            console.log('Successfully wrote file')
        }
    })
}