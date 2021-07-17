let cant
let results = {}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

process.on('message', msg => {
    cant = msg
    // console.log('child-process (randoms.js): ', msg)

    for (let i = 0; i < cant ; i++) {
    let randomNum = randomIntFromInterval(1, 1000)
    if (randomNum in results) {
        results[randomNum]++
    } else {
        results[randomNum] = 1
    }
}
process.send(results)
})

process.on('beforeExit', (code) => {
    console.log("child-process exiting with code: ", code)
})

