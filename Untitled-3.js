
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

client.on("connect", function () {
    document.getElementById("connection").innerText =
        "Đã kết nối MQTT Broker";

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

    console.log(error);
});

client.on("offline", function () {
    document.getElementById("connection").innerText =
        "Mất kết nối MQTT";
});

client.on("message", function (topic, message) {
    const value = message.toString();

    if (topic === TOPIC_GAS) {
        document.getElementById("gas").innerText = value;
    }

    if (topic === TOPIC_TEMP) {
        document.getElementById("temperature").innerText = value;
    }

    if (topic === TOPIC_FAN_STATE) {
        document.getElementById("fanState").innerText = value;
    }

    if (topic === TOPIC_PUMP_STATE) {
        document.getElementById("pumpState").innerText = value;
    }
});

function controlDevice(device, command) {
    if (!client.connected) {
        alert("Chưa kết nối MQTT Broker!");
        return;
    }

    if (device === "fan") {
        client.publish(TOPIC_FAN_SET, command);
    }

    if (device === "pump") {
        client.publish(TOPIC_PUMP_SET, command);
    }
}
