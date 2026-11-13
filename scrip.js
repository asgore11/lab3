
const broker = "wss://broker.hivemq.com:8884/mqtt";

const options = {
    clean: true,
    connectTimeout: 4000,
    clientId: "WebFireAlarm_" + Math.random().toString(16).slice(2, 10)
};

const client = mqtt.connect(broker, options);

const TOPIC_GAS = "firealarm476646/gas";
const TOPIC_TEMP = "firealarm476646/temperature";

const TOPIC_FAN_SET = "firealarm476646/fan/set";
const TOPIC_PUMP_SET = "firealarm476646/pump/set";

const TOPIC_FAN_STATE = "firealarm476646/fan/state";
const TOPIC_PUMP_STATE = "firealarm476646/pump/state";

let fanOn = false;
let pumpOn = false;

const labels = [];
const gasData = [];
const tempData = [];

const gasChart = new Chart(
    document.getElementById("gasChart"),
    {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Nồng độ khí gas",
                data: gasData,
                borderColor: "#fb7185",
                backgroundColor: "rgba(251,113,133,0.15)",
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    }
);

const tempChart = new Chart(
    document.getElementById("tempChart"),
    {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Nhiệt độ",
                data: tempData,
                borderColor: "#60a5fa",
                backgroundColor: "rgba(96,165,250,0.15)",
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    }
);

client.on("connect", function () {
    document.getElementById("connection").innerText =
        "Đã kết nối MQTT";

    document.getElementById("connectionDot").style.background =
        "#22c55e";

    client.subscribe([
        TOPIC_GAS,
        TOPIC_TEMP,
        TOPIC_FAN_STATE,
        TOPIC_PUMP_STATE
    ]);
});

client.on("error", function (error) {
    document.getElementById("connection").innerText =
        "Lỗi kết nối MQTT";

    document.getElementById("connectionDot").style.background =
        "#ef4444";

    console.log(error);
});

client.on("offline", function () {
    document.getElementById("connection").innerText =
        "Mất kết nối MQTT";

    document.getElementById("connectionDot").style.background =
        "#ef4444";
});

function updateChart() {
    if (labels.length > 20) {
        labels.shift();
        gasData.shift();
        tempData.shift();
    }

    gasChart.update();
    tempChart.update();
}

client.on("message", function (topic, message) {
    const value = message.toString();

    if (topic === TOPIC_GAS) {
        const gas = Number(value);

        if (!Number.isFinite(gas)) return;

        document.getElementById("gas").innerText =
            gas.toFixed(1);

        document.getElementById("gasStatus").innerText =
            gas >= 40 ? "CẢNH BÁO KHÍ GAS" : "Bình thường";

        labels.push(new Date().toLocaleTimeString());

        gasData.push(gas);
        tempData.push(
            tempData.length > 0
                ? tempData[tempData.length - 1]
                : null
        );

        updateChart();
    }

    if (topic === TOPIC_TEMP) {
        const temperature = Number(value);

        if (!Number.isFinite(temperature)) return;

        document.getElementById("temperature").innerText =
            temperature.toFixed(1);

        document.getElementById("tempStatus").innerText =
            temperature >= 35
                ? "CẢNH BÁO NHIỆT ĐỘ"
                : "Bình thường";

        if (labels.length === 0) {
            labels.push(new Date().toLocaleTimeString());
            gasData.push(null);
        }

        tempData.push(temperature);

        while (tempData.length > labels.length) {
            labels.push(new Date().toLocaleTimeString());
            gasData.push(null);
        }

        updateChart();
    }

    if (topic === TOPIC_FAN_STATE) {
        fanOn = value === "ON";
        updateDeviceButton("fan");
    }

    if (topic === TOPIC_PUMP_STATE) {
        pumpOn = value === "ON";
        updateDeviceButton("pump");
    }
});

function updateDeviceButton(device) {
    if (device === "fan") {
        document.getElementById("fanState").innerText =
            fanOn ? "ĐANG BẬT" : "ĐANG TẮT";

        const button = document.getElementById("fanButton");

        button.innerText = fanOn ? "TẮT QUẠT" : "BẬT QUẠT";
        button.classList.toggle("off", fanOn);
    }

    if (device === "pump") {
        document.getElementById("pumpState").innerText =
            pumpOn ? "ĐANG BẬT" : "ĐANG TẮT";

        const button = document.getElementById("pumpButton");

        button.innerText = pumpOn
            ? "TẮT MÁY BƠM"
            : "BẬT MÁY BƠM";

        button.classList.toggle("off", pumpOn);
    }
}

function toggleDevice(device) {
    if (!client.connected) {
        alert("Chưa kết nối MQTT Broker!");
        return;
    }

    if (device === "fan") {
        client.publish(
            TOPIC_FAN_SET,
            fanOn ? "OFF" : "ON"
        );
    }

    if (device === "pump") {
        client.publish(
            TOPIC_PUMP_SET,
            pumpOn ? "OFF" : "ON"
        );
    }
}
