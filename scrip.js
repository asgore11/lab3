
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

let gasChart = null;
let tempChart = null;

let fanOn = null;
let pumpOn = null;

function updateConnection(status, message) {
    const dot = document.getElementById("connectionDot");
    const text = document.getElementById("connection");

    dot.className = "dot " + status;
    text.textContent = message;
}

function createCharts() {
    const gasContext = document.getElementById("gasChart").getContext("2d");
    const tempContext = document.getElementById("tempChart").getContext("2d");

    gasChart = new Chart(gasContext, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Khí gas (%)",
                data: [],
                borderColor: "#38bdf8",
                backgroundColor: "rgba(56, 189, 248, 0.15)",
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                y: {
                    min: 0,
                    max: 100
                }
            }
        }
    });

    tempChart = new Chart(tempContext, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Nhiệt độ (°C)",
                data: [],
                borderColor: "#f97316",
                backgroundColor: "rgba(249, 115, 22, 0.15)",
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false
        }
    });
}

function addChartData(chart, value) {
    const time = new Date().toLocaleTimeString("vi-VN");

    chart.data.labels.push(time);
    chart.data.datasets[0].data.push(value);

    if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update("none");
}

function updateGas(value) {
    document.getElementById("gas").textContent = value.toFixed(2);

    const status = document.getElementById("gasStatus");

    if (value > GAS_THRESHOLD) {
        status.textContent = "CẢNH BÁO: Nồng độ khí gas cao";
        status.className = "status warning";
    } else {
        status.textContent = "Bình thường";
        status.className = "status normal";
    }

    addChartData(gasChart, value);
}

function updateTemperature(value) {
    document.getElementById("temperature").textContent = value.toFixed(2);

    const status = document.getElementById("tempStatus");

    if (value > TEMP_THRESHOLD) {
        status.textContent = "CẢNH BÁO: Nhiệt độ cao";
        status.className = "status warning";
    } else {
        status.textContent = "Bình thường";
        status.className = "status normal";
    }

    addChartData(tempChart, value);
}

function updateDeviceState(device, message) {
    const state = message.toString().trim().toUpperCase();

    if (state !== "ON" && state !== "OFF") {
        return;
    }

    const element = document.getElementById(
        device === "fan" ? "fanState" : "pumpState"
    );

    if (device === "fan") {
        fanOn = state === "ON";
    } else {
        pumpOn = state === "ON";
    }

    element.textContent = state === "ON" ? "ĐANG BẬT" : "ĐANG TẮT";
    element.className = "device-state " + (state === "ON" ? "on" : "off");
}

function connectMQTT() {
    updateConnection("connecting", "Đang kết nối MQTT...");

    client = mqtt.connect(BROKER, {
        clientId: "PHAMTIENLUC_WEB_" + Math.random().toString(16).substring(2, 10),
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 3000
    });

    client.on("connect", function () {
        updateConnection("connected", "Đã kết nối MQTT");

        client.subscribe([
            TOPIC_GAS,
            TOPIC_TEMP,
            TOPIC_FAN_STATE,
            TOPIC_PUMP_STATE
        ], function (error) {
            if (error) {
                console.error("Lỗi đăng ký Topic:", error);
            } else {
                console.log("Đã đăng ký các Topic MQTT");
            }
        });
    });

    client.on("message", function (topic, message) {
        const value = Number(message.toString());

        if (topic === TOPIC_GAS) {
            if (Number.isFinite(value)) {
                updateGas(value);
            }
        }

        else if (topic === TOPIC_TEMP) {
            if (Number.isFinite(value)) {
                updateTemperature(value);
            }
        }

        else if (topic === TOPIC_FAN_STATE) {
            updateDeviceState("fan", message);
        }

        else if (topic === TOPIC_PUMP_STATE) {
            updateDeviceState("pump", message);
        }
    });

    client.on("reconnect", function () {
        updateConnection("connecting", "Đang kết nối lại...");
    });

    client.on("offline", function () {
        updateConnection("disconnected", "Mất kết nối MQTT");
    });

    client.on("error", function (error) {
        console.error("MQTT error:", error);
        updateConnection("disconnected", "Lỗi kết nối MQTT");
    });

    client.on("close", function () {
        updateConnection("disconnected", "Đã ngắt kết nối");
    });
}

function sendCommand(device, command) {
    if (!client || !client.connected) {
        alert("Website chưa kết nối MQTT!");
        return;
    }

    let topic;

    if (device === "fan") {
        topic = TOPIC_FAN_SET;
    } else if (device === "pump") {
        topic = TOPIC_PUMP_SET;
    } else {
        return;
    }

    client.publish(topic, command, function (error) {
        if (error) {
            console.error("Không gửi được lệnh:", error);
        } else {
            console.log("Đã gửi", command, "đến", topic);
        }
    });
}

window.addEventListener("load", function () {
    createCharts();
    connectMQTT();
});
