const seneca = require('seneca')({timeout: 1000})
const port = process.env.PORT || 8081
const mapped_port = process.env.MAPPED_PORT || 8081 // Clever Cloud -> 80
const host = process.env.HOST || 'localhost' // domain name

const TemperatureSensor = require('./things/TemperatureSensor').TemperatureSensor;
const HumiditySensor = require('./things/HumiditySensor').HumiditySensor;

// ============ SENSORS ============
// rien
let randomDelay =  () => {
  let getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  return getRandomInt(1500, 4000);
}
// Generate n temperature sensors
let temperatureSensors = [...Array(5).keys()].map(item => {
  let t = new TemperatureSensor({id:`t${item}`, minTemperature:-10, maxTemperature:10, delay:randomDelay()});
  t.start("generateData");
  return  t;
});

// Generate n humidity sensors
let humiditySensors = [...Array(5).keys()].map(item => {
  let h = new HumiditySensor({id:`h${item}`, delay:randomDelay()});
  h.start("generateData");
  return  h;
});
// =================================

const rediscli = require("redis").createClient({
  url:process.env.REDIS_URL
});

// ⚠️⚠️⚠️ the id has to start with `gateway-`
const service_id = process.env.SERVICE_ID || "gateway-42-next-service-local-dev"

// used to check if the gateway is ok
function yo(options) {
  this.add({role: "hello", cmd: "yo"}, (message, reply) => {
    reply(null, {answer: "yo"})
  })
}

function sensors(options) {
  // all sensors
  this.add({role: "sensors", cmd: "all"}, (message, reply) => {
    reply(null, {
      temperatureSensors: temperatureSensors.map(sensor => sensor.getData()),
      humiditySensors: humiditySensors.map(sensor => sensor.getData())
    })
  })

  // all temperature sensors
  this.add({role: "sensors", cmd: "temperature"}, (message, reply) => {
    reply(null, temperatureSensors.map(sensor => sensor.getData()))
  })

  // all humidity sensors
  this.add({role: "sensors", cmd: "humidity"}, (message, reply) => {
    reply(null, humiditySensors.map(sensor => sensor.getData()))
  })

  // one temperature sensor
  //  senecaClient.act({role:'one-sensor', cmd: 'temperature', id:'t1'}, (err, item) => {})
  //  query: http://localhost:8081/act?role=one-sensor&cmd=temperature&id=t1
  this.add({role: "one-sensor", cmd: "temperature"}, (message, reply) => {
    let sensor = temperatureSensors.find(sensor => sensor.id == message.id);
    if(sensor) {
      reply(null, sensor.getData())
    } else {
      reply(null, null)
    };
  })

  // one humidity sensor
  //  senecaClient.act({role:'one-sensor', cmd: 'humidity', id:'h1'}, (err, item) => {})
  //  query: http://localhost:8081/act?role=one-sensor&cmd=humidity&id=h2
  this.add({role: "one-sensor", cmd: "humidity"}, (message, reply) => {
    let sensor = humiditySensors.find(sensor => sensor.id == message.id);
    if(sensor) {
      reply(null, sensor.getData())
    } else {
      reply(null, null)
    };
  })

}


seneca
  .use(yo)
  .use(sensors)
  .listen({
    host: '0.0.0.0',
    port: port
  })

let iam = () => {
  rediscli.set(service_id, JSON.stringify({
      host: host
    , port: mapped_port
    , services:[
          "hello:yo"
        , "sensors:all"
        , "sensors:temperature"
        , "sensors:humidity"
        , "one-sensor:temperature"
        , "one-sensor:humidity"
      ]
    , instanceInformations: {
          APP_ID: process.env.APP_ID || "APP_ID"
        , INSTANCE_ID: process.env.INSTANCE_ID || "INSTANCE_ID"
        , INSTANCE_TYPE: process.env.INSTANCE_TYPE || "INSTANCE_TYPE"
        , COMMIT_ID: process.env.COMMIT_ID || "COMMIT_ID"
        , INSTANCE_NUMBER: process.env.INSTANCE_NUMBER || "INSTANCE_NUMBER"
        , kind:"🌧☀️"
      }
  }));
}

iam()

const timer = setInterval(iam, 10000)


console.info(`🌍 service ${service_id} is listening on ${host}:${mapped_port}`)
console.log(`🤖 you can call: http://${host}:${mapped_port}/act?role=hello&cmd=yo`)
// tests on CC: http://yoservicedemo.cleverapps.io/act?role=hello&cmd=yo
// tests on CC: http://yoservicedemo.cleverapps.io/act?role=sensors&cmd=all

// http://localhost:8081/act?role=sensors&cmd=all
