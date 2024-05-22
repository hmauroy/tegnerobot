/*
* Request data from Arduino    
*/
//% block "Request Data from Arduino"
export function requestData(): void {
    // Request 32 bytes from the slave device
    pins.i2cWriteNumber(PCA9557_ADDR, 0, NumberFormat.UInt8LE, true)
    let receivedData = i2cReadString(PCA9557_ADDR, 32, NumberFormat.UInt8LE)

    serialLog(receivedData);

}

/*
* Internal function to construct a string from I2C-communication.
*/
function i2cReadString(address: number, maxLength: number, delimiter: number = 0): string {
    let receivedData = ""
    let buf = pins.i2cReadBuffer(address, maxLength, false)

    for (let i = 0; i < maxLength; i++) {
        let charCode = buf.getNumber(NumberFormat.UInt8LE, i)
        if (charCode == delimiter || charCode == 0) {
            break
        }
        receivedData += String.fromCharCode(charCode)
    }

    return receivedData
}