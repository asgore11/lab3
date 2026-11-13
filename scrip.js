const ID = "PHAMTIENLUC"
const BROKER = "wss://broker.hivemq.com:8884/mqtt";

const TOPIC_GAS = "PHAMTIENLUC/gas";
const TOPIC_TEMP = "PHAMTIENLUC/temperature";

const TOPIC_FAN_SET = "PHAMTIENLUC/fan/set";
const TOPIC_PUMP_SET = "PHAMTIENLUC/pump/set";

const TOPIC_FAN_STATE = "PHAMTIENLUC/fan/state";
const TOPIC_PUMP_STATE = "PHAMTIENLUC/pump/state";
const GAS_THRESHOLD = 40;
const TEMP_THRESHOLD = 35;

let client = null;

let fanOn = false;
let pumpOn = false;

let gasChart = null;
let tempChart = null;

const gasLabels = [];
const gasValues = [];

const tempLabels = [];
const tempValues = [];

function setConnection(status, message) {
    const connection = document.getElementById("connection");
    const dot = document.getElementById("connectionDot");

    if (connection) {
        connection.textContent = message;
    }

    if (dot) {
        dot.className = status;
    }
}

function createCharts() {
    if (typeof Chart === "undefined") {
        console.error("Khong tim thay thu vien Chart.js");
        return;
    }

    const gasCanvas = document.getElementById("gasChart");
    const tempCanvas = document.getElementById("tempChart");

    if (gasCanvas) {
        gasChart = new Chart(gasCanvas, {
            type: "line",
            data: {
                labels: gasLabels,
                datasets: [{
                    label: "Nong do gas (%)",
                    data: gasValues,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    if (tempCanvas) {
        tempChart = new Chart(tempCanvas, {
            type: "line",
            data: {
                labels: tempLabels,
                datasets: [{
                    label: "Nhiet do (°C)",
                    data: tempValues,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

function updateChart(chart, labels, values, value) {
    if (!chart) return;

    const now = new Date().toLocaleTimeString("vi-VN");

    labels.push(now);
    values.push(value);

    if (labels.length > 20) {
        labels.shift();
        values.shift();
    }

    chart.update("none");
}

function updateGas(value) {
    const gasElement = document.getElementById("gas");
    const statusElement = document.getElementById("gasStatus");

    if (gasElement) {
        gasElement.textContent = value.toFixed(2) + " %";
    }

    if (statusElement) {
        statusElement.textContent =
            value > GAS_THRESHOLD ? "CANH BAO" : "Binh thuong";
    }

    updateChart(gasChart, gasLabels, gasValues, value);
}

function updateTemperature(value) {
    const tempElement = document.getElementById("temperature");
    const statusElement = document.getElementById("tempStatus");

    if (tempElement) {
        tempElement.textContent = value.toFixed(2) + " °C";
    }

    if (statusElement) {
        statusElement.textContent =
            value > TEMP_THRESHOLD ? "CANH BAO" : "Binh thuong";
    }

    updateChart(tempChart, tempLabels, tempValues, value);
}

function updateFanState(state) {
    fanOn = state === "ON";

    const stateElement = document.getElementById("fanState");
    const button = document.getElementById("fanButton");

    if (stateElement) {
        stateElement.textContent = fanOn ? "ĐANG BẬT" : "ĐANG TẮT";
    }

    if (button) {
        button.textContent = fanOn ? "TẮT QUẠT" : "BẬT QUẠT";
    }
}

function updatePumpState(state) {
    pumpOn = state === "ON";

    const stateElement = document.getElementById("pumpState");
    const button = document.getElementById("pumpButton");

    if (stateElement) {
        stateElement.textContent = pumpOn ? "ĐANG BẬT" : "ĐANG TẮT";
    }

    if (button) {
        button.textContent = pumpOn ? "TẮT MÁY BƠM" : "BẬT MÁY BƠM";
    }
}

function connectMQTT() {
    if (typeof mqtt === "undefined") {
        setConnection("disconnected", "Lỗi thư viện MQTT");
        console.error("Khong tai duoc MQTT.js");
        return;
    }

    setConnection("connecting", "Đang kết nối...");

    const options = {
        clientId: "FireAlarmWeb_" + Math.random().toString(16).slice(2, 10),
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 3000
    };

    client = mqtt.connect(BROKER, options);

    client.on("connect", function () {
        console.log("Da ket noi MQTT HiveMQ!");

        setConnection("connected", "Đã kết nối MQTT");

        client.subscribe([
            TOPIC_GAS,
            TOPIC_TEMP,
            TOPIC_FAN_STATE,
            TOPIC_PUMP_STATE
        ], function (error) {
            if (error) {
                console.error("Loi dang ky Topic:", error);
            } else {
                console.log("Da dang ky cac Topic!");
            }
        });
    });

    client.on("message", function (topic, message) {
        const value = message.toString().trim();

        console.log("Nhan du lieu:", topic, value);

        if (topic === TOPIC_GAS) {
            const gas = Number(value);

            if (Number.isFinite(gas)) {
                updateGas(gas);
            }
        }

        else if (topic === TOPIC_TEMP) {
            const temperature = Number(value);

            if (Number.isFinite(temperature)) {
                updateTemperature(temperature);
            }
        }

        else if (topic === TOPIC_FAN_STATE) {
            updateFanState(value);
        }

        else if (topic === TOPIC_PUMP_STATE) {
            updatePumpState(value);
        }
    });

    client.on("reconnect", function () {
        setConnection("connecting", "Đang kết nối lại...");
        console.log("Dang ket noi lai MQTT...");
    });

    client.on("offline", function () {
        setConnection("disconnected", "Mất kết nối MQTT");
        console.log("MQTT offline");
    });

    client.on("close", function () {
        setConnection("disconnected", "Đã ngắt kết nối");
    });

    client.on("error", function (error) {
        console.error("Loi MQTT:", error);
        setConnection("disconnected", "Lỗi kết nối MQTT");
    });
}

function toggleDevice(device) {
    if (!client || !client.connected) {
        alert("Website chua ket noi MQTT!");
        return;
    }

    let topic;
    let command;

    if (device === "fan") {
        topic = TOPIC_FAN_SET;
        command = fanOn ? "OFF" : "ON";
    }

    else if (device === "pump") {
        topic = TOPIC_PUMP_SET;
        command = pumpOn ? "OFF" : "ON";
    }

    else {
        return;
    }

    client.publish(topic, command, function (error) {
        if (error) {
            console.error("Loi gui lenh:", error);
            alert("Khong gui duoc lenh dieu khien!");
        } else {
            console.log("Da gui lenh:", topic, command);
        }
    });
}

window.toggleDevice = toggleDevice;

document.addEventListener("DOMContentLoaded", function () {
    createCharts();
    connectMQTT();
});
