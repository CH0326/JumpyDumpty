var https = require('https');
var qs = require('querystring');
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const {
    clipboard,
    Notification
} = require('electron')
const axios = require('axios')
const {
    toSetName,
    toPostionName,
    toTagName,
    setToDetail
} = require('./ocrData/Artifacts.json')

const {
    sendMsgToFloatingWin
} = require('./floatingWin');

const addonShot = require('../../build/Release/ScreenShot.node');

let artifactNotification = {
    result: '',
    msg: '',
    mainTag: {},
    normalTags: []
}

// 显示系统通知,没什么用了
function showNotification(res, msg) {
    if (res == "success") {
        let notification = new Notification({
            title: 'OCR成功',
            body: '请继续点击下一个圣遗物'
        })
        notification.show()
        setTimeout(() => {
            notification.close()
        }, 1200);
    } else if (res == "error") {
        let notification = new Notification({
            title: 'OCR失败',
            body: msg
        })
        notification.show()
        setTimeout(() => {
            notification.close()
        }, 4500);
    }
}


// 获取AccessToken
function getAccessToken(value1, value2, callback) {
    let param = qs.stringify({
        'grant_type': 'client_credentials',
        'client_id': value1.replace(/\s*/g, ""),
        'client_secret': value2.replace(/\s*/g, "")
    });
    https.get({
        hostname: 'aip.baidubce.com',
        path: '/oauth/2.0/token?' + param,
        agent: false
    }, function (res) {
        // 在标准输出中查看运行结果
        // 写入文件
        res.pipe(fs.createWriteStream(path.resolve(__dirname, '../../../../../config/baiduToken.json')));
        callback()
    });
}

// 将获取的获取AccessToken单独保存
function saveAccessToken(value) {
    fs.readFile(path.resolve(__dirname, '../../../../../config/baiduToken.json'), function (err, data) {
        if (err) {
            // throw err;
            // 文件不存在
            let tokenData = {
                access_token: value
            }
            fs.writeFile(path.resolve(__dirname, '../../../../../config/baiduToken.json'), JSON.stringify(tokenData, null, 4), (err) => {
                if (err) throw err
            })
        } else {
            let tokenData = JSON.parse(data.toString())
            tokenData.access_token = value
            fs.writeFile(path.resolve(__dirname, '../../../../../config/baiduToken.json'), JSON.stringify(tokenData, null, 4), (err) => {
                if (err) throw err
            })
        }
    })
}

function ocrArtifactDetails(ipcData, ifShow, callback) {

    // 截图
    addonShot.shot(ipcData.config.className, ipcData.config.windowName, ipcData.ocrConfig.widthRatio, ipcData.ocrConfig.heightRatio, ipcData.ocrConfig.xPosRatio, ipcData.ocrConfig.yPosRatio, ipcData.ocrConfig.ifFullScreen == true ? 1 : 0)
    // 读取剪贴板的图片
    let img = clipboard.readImage()
    if (!img.isEmpty()) {
        let imgUrl = img.toDataURL()
        fs.readFile(path.resolve(__dirname, '../../../../config/ocrConfig.json'), function (err, resAPI) {
            if (err) {
                throw err
            } else {
                let api = JSON.parse(resAPI.toString()).api
                // 将图片写入本地
                fs.writeFile(path.resolve(__dirname, '../../../../../data/artifact.jpg'), Buffer.from(imgUrl.replace('data:image/png;base64,', ''), 'base64'), (err) => {
                    console.log('save-img-success')
                    fs.readFile(path.resolve(__dirname, '../../../../config/baiduToken.json'), function (err, resToken) {
                        if (err) {
                            throw err
                        } else {
                            let access_token = JSON.parse(resToken.toString()).access_token
                            // 再读
                            fs.readFile(path.resolve(__dirname, '../../../../../data/artifact.jpg'), function (err, data) {
                                if (err) {
                                    throw err
                                } else {
                                    let image = data
                                    let imgData = Buffer.from(image).toString('base64');
                                    axios({
                                        url: api + access_token,
                                        method: 'post',
                                        data: qs.stringify({
                                            'image': imgData
                                        }),
                                        headers: {
                                            'content-type': 'application/x-www-form-urlencoded'
                                        }
                                    }).then(function (response) {
                                        // console.log(response.data)
                                        handleOcrData(response.data, ifShow, callback)
                                    }, function (err) {
                                        if (ifShow) {
                                            artifactNotification.result = "error"
                                            artifactNotification.msg = "发送申请失败"
                                            sendMsgToFloatingWin(artifactNotification)
                                            // showNotification("error", "发送申请失败")
                                        }
                                    })
                                }
                            })
                        }
                    })
                })
            }
        })
    }
}

// 对百度OCR的返回数据进行提取
function handleOcrData(ocrData, ifShow, callback) {
    let artifactData = {
        mainTag: {},
        normalTags: []
    }
    artifactNotification.normalTags = []

    let ifmainTagValue = false
    let ifmainTagValueCheck = false
    let ifOCRFinished = false

    fs.writeFile(path.resolve(__dirname, '../../../../../data/ocrData.json'), JSON.stringify(ocrData, null, 4), (err) => {
        if (err) throw err
        else {
            console.log("write-ocrData")
        }
    })

    // 字数过少，有问题
    if (ocrData.words_result_num < 8) {
        if (ifShow) {
            artifactNotification.result = "error"
            artifactNotification.msg = "OCR返回结果过少，请检查游戏分辨率和打开的界面是否正确"
            sendMsgToFloatingWin(artifactNotification)
        }
        if (callback) {
            callback()
        }

        return
    }
    // 返回了错误代码,有问题
    if (ocrData.error_code) {
        if (ifShow) {
            artifactNotification.result = "error"
            // 图片尺寸问题
            if (ocrData.error_code == 216202) {
                artifactNotification.msg = "抓取不到图片，请检查游戏是否保持前台"
            } else if (ocrData.error_code == 18) { //申请过快
                artifactNotification.msg = "OCR申请过于频繁，请减慢点击速度"
            } else if (ocrData.error_code == 110) { //token错误
                artifactNotification.msg = "Access Token设置错误"
            } else {
                artifactNotification.msg = JSON.stringify(ocrData, null, 4)
            }
            sendMsgToFloatingWin(artifactNotification)
        }
        if (callback) {
            callback()
        }
        return
    }

    if (ocrData.words_result_num)
        for (let item of ocrData.words_result) {
            if (!ifOCRFinished) {

                // 获取位置名字
                if (item.words in toPostionName) {

                    artifactData.position = toPostionName[item.words]
                    // 中文名
                    artifactNotification.position = item.words
                    continue
                }

                // 获取主属性名称
                if (item.words in toTagName) {

                    if (artifactData.position == "flower") {
                        artifactData.mainTag.name = toTagName["固定生命值"]

                        artifactNotification.mainTag.name = "生命值"

                    } else if (artifactData.position == "feather") {
                        artifactData.mainTag.name = toTagName["固定攻击力"]

                        artifactNotification.mainTag.name = "攻击力"

                    } else {
                        artifactData.mainTag.name = toTagName[item.words]

                        artifactNotification.mainTag.name = item.words
                    }
                    ifmainTagValue = true

                    continue
                }

                // 检测主属性的数值是否提前录入错误,有则重新录入
                if (ifmainTagValueCheck && !ifmainTagValue) {
                    if (isNaN(item.words.replace(/,|%/g, ""))) {
                        ifmainTagValueCheck = false

                        continue
                    }

                    ifmainTagValue = true
                }

                // 获取主属性的数值
                if (ifmainTagValue) {
                    if (isNaN(item.words.replace(/,|%/g, ""))) {
                        continue
                    }
                    ifmainTagValue = false


                    // 花和羽
                    if (artifactData.position == "flower" || artifactData.position == "feather") {
                        // 有逗号或句号的普通数值
                        if (item.words.indexOf(",") >= 0) {
                            artifactData.mainTag.value = parseInt(item.words.replace(/,/g, ""))

                            artifactNotification.mainTag.value = artifactData.mainTag.value
                        } else if (item.words.indexOf(".") >= 0) {
                            artifactData.mainTag.value = parseInt(String(item.words).replace(/\./g, ""))

                            artifactNotification.mainTag.value = artifactData.mainTag.value
                        }
                        //普通数值 
                        else {
                            artifactData.mainTag.value = parseInt(item.words)

                            artifactNotification.mainTag.value = artifactData.mainTag.value
                        }
                    } else {
                        // 百度OCR可能有识别不了百分号的情况，这里按有无百分号处理
                        // 只有元素精通无百分号
                        if (artifactData.mainTag.name == "elementalMastery") {
                            artifactData.mainTag.value = parseInt(item.words)

                            artifactNotification.mainTag.value = artifactData.mainTag.value
                        } else {
                            // 甚至可能识别不了小数点
                            if (item.words.replace(/%/g, "") > 62.2) {
                                artifactData.mainTag.value = parseFloat(item.words.replace(/%/g, "")) / 1000
                            } else {
                                artifactData.mainTag.value = parseFloat(item.words.replace(/%/g, "")) / 100
                            }

                            artifactNotification.mainTag.value = (artifactData.mainTag.value * 100).toFixed(1) + "%"
                        }
                    }
                    ifmainTagValueCheck = true
                    continue
                }


                // 获取副属性
                for (let tagName in toTagName) {
                    if (item.words.indexOf(tagName) >= 0) {

                        let ifPercentageTag = false
                        let normalTag = {
                            name: "",
                            value: ""
                        }
                        let normalTagNotification = {
                            name: "",
                            value: ""
                        }
                        // 找副属性的+号
                        if (item.words.indexOf("+") >= 0) {

                            normalTag.value = item.words.substring(item.words.indexOf("+") + 1)
                            // 去中文
                            normalTag.value = normalTag.value.replace(/[\u4e00-\u9fa5]{0,}/g, "")
                            // 百分号数值
                            if (normalTag.value.indexOf("%") >= 0) {
                                ifPercentageTag = true

                                // 百度OCR可能有识别不了小数点的情况
                                if (normalTag.value.replace(/%/g, "") > 46.8) {
                                    normalTag.value = parseFloat(normalTag.value.replace(/%/g, "")) / 1000
                                } else {
                                    normalTag.value = parseFloat(normalTag.value.replace(/%/g, "")) / 100
                                }

                                normalTagNotification.value = (normalTag.value * 100).toFixed(1) + "%"
                            }
                            // 还会漏百分号
                            else if (tagName == "暴击率" || tagName == "暴击伤害" || tagName == "元素充能效率" || String(normalTag.value).indexOf(".") >= 0) {
                                ifPercentageTag = true
                                if (normalTag.value > 46.8) {
                                    normalTag.value = parseFloat(normalTag.value) / 1000
                                } else {
                                    normalTag.value = parseFloat(normalTag.value) / 100
                                }

                                normalTagNotification.value = (normalTag.value * 100).toFixed(1) + "%"
                            }
                            // 有逗号的普通数值
                            else if (normalTag.value.indexOf(",") >= 0) {
                                normalTag.value = parseInt(normalTag.value.replace(/,/g, ""))

                                normalTagNotification.value = normalTag.value
                            }
                            //普通数值 
                            else {
                                normalTag.value = parseInt(normalTag.value)

                                normalTagNotification.value = normalTag.value
                            }

                            // 可能把1给漏掉
                            if (String(normalTag.value).indexOf('.') >= 0) {
                                if (normalTag.value < 0.022) {
                                    console.log(normalTag.value)
                                    normalTag.value = parseFloat(('1' + normalTag.value * 100) / 100)
                                    console.log(normalTag.value)
                                    normalTagNotification.value = (normalTag.value * 100).toFixed(1) + "%"
                                }
                            } else if (normalTag.value < 11) {
                                normalTag.value = parseInt('1' + normalTag.value)

                                normalTagNotification.value = normalTag.value
                            }
                        }
                        if (ifPercentageTag) {
                            normalTag.name = toTagName[tagName]

                            normalTagNotification.name = tagName //中文名
                        } else {
                            if (tagName == "攻击力") {
                                normalTag.name = toTagName["固定攻击力"]
                                normalTagNotification.name = "攻击力"
                            } else if (tagName == "防御力") {
                                normalTag.name = toTagName["固定防御力"]
                                normalTagNotification.name = "防御力"
                            } else if (tagName == "生命值") {
                                normalTag.name = toTagName["固定生命值"]
                                normalTagNotification.name = "生命值"
                            } else {
                                normalTag.name = toTagName[tagName]
                                normalTagNotification.name = tagName
                            }
                        }
                        artifactData.normalTags.push(normalTag)

                        artifactNotification.normalTags.push(normalTagNotification)
                        break
                    }
                }

                // 获取套装名字,判断结束
                for (let setNameItem in toSetName) {
                    if (item.words.indexOf(setNameItem) >= 0) {
                        // 有的套装名字会包含在具体的名字上,防止提前结束
                        if (artifactData.position == null) {
                            continue
                        } else {
                            artifactData.setName = toSetName[setNameItem]
                            artifactNotification.setName = setNameItem
                            ifOCRFinished = true
                            break
                        }

                    }
                }
            }
        }

    setsName = setToDetail[artifactData.setName]

    artifactData.detailName = setsName[artifactData.position]
    artifactNotification.detailName = artifactData.detailName

    artifactData.omit = false

    // 如果得不到圣遗物的具体名字，有问题
    if (artifactData.detailName == null) {
        fs.writeFile(path.resolve(__dirname, '../../../../../data/errorArtifactData.json'), JSON.stringify(artifactData, null, 4), (err) => {
            if (err) throw err
            else {
                artifactNotification.result = "error"
                artifactNotification.msg = "分析该圣遗物异常，请手动录入！"
                if (ifShow) {
                    sendMsgToFloatingWin(artifactNotification)
                }
            }
        })
    } else {
        artifactNotification.result = "success"
        if (ifShow) {
            sendMsgToFloatingWin(artifactNotification)
        }
        writeOCRData(artifactData, ifShow, callback)
    }
}

// 将处理好的数据写入本地
function writeOCRData(writeData, ifShow, callback) {
    fs.readFile(path.resolve(__dirname, '../../../../../data/artifacts.json'), function (err, data) {
        if (err) {
            if (ifShow) {
                showNotification("error", "读取圣遗物记录失败")
            }
            // throw err;
        } else {
            fs.readFile(path.resolve(__dirname, '../../../../../config/ocrConfig.json'), function (err, resIfd) {
                if (err) {
                    throw err
                } else {
                    let ifDereplication = JSON.parse(resIfd.toString()).ifDereplication
                    let dataSource = JSON.parse(data.toString())
                    if (Object.keys(dataSource).length != 0) {
                    } else {
                        // 初始化
                        dataSource = {
                            flower: [],
                            feather: [],
                            sand: [],
                            cup: [],
                            head: []
                        }
                    }
                    // md5运算生成ID
                    writeData.id = crypto.createHash('md5').update(JSON.stringify(writeData)).digest("hex")

                    // 去重复，比对md5
                    if (ifDereplication) {
                        for (let itemName in dataSource) {
                            if (dataSource[itemName].length == 0) {
                                continue
                            } else {
                                let temp = dataSource[itemName]
                                for (let tempItem in temp) {
                                    // 有重复的

                                    if (temp[tempItem].id == writeData.id) {

                                        if (callback) {
                                            // 很蠢的反馈方式，待重构
                                            let writeCallBackData = {
                                                error_code: 1000000
                                            }
                                            fs.writeFile(path.resolve(__dirname, '../../../../../data/ocrData.json'), JSON.stringify(writeCallBackData, null, 4), (err) => {
                                                if (err) throw err
                                                else {}
                                            })
                                            callback()
                                        }
                                        if (ifShow) {
                                            artifactNotification.result = "error"
                                            artifactNotification.msg = "重复的圣遗物，本次录入无效"
                                            sendMsgToFloatingWin(artifactNotification)
                                        }
                                        return
                                    }
                                }
                            }
                        }
                    }

                    dataSource[writeData.position].push(writeData)

                    fs.writeFile(path.resolve(__dirname, '../../../../../data/artifacts.json'), JSON.stringify(dataSource, null, 4), (err) => {
                        if (err) throw err
                        else {
                            if (callback) {
                                console.log("call-back")
                                callback()
                            }
                        }
                    })
                }
            })

        }
    });
}

// 清空存储的圣遗物
function artifactsReset(callback) {
    let data = {}
    fs.writeFile(path.resolve(__dirname, '../../../../../data/artifacts.json'), JSON.stringify(data, null, 4), (err) => {
        if (err) throw err
        else {
            console.log("reset")
            if (callback) {
                callback()
            }
        }
    })
}

// 将圣遗物导出到剪贴板
function expoetToClicpBoard(callback) {
    fs.readFile(path.resolve(__dirname, '../../../../../data/artifacts.json'), function (err, data) {
        if (err) {
            // throw err;
        } else {
            clipboard.writeText(data.toString())
            if (callback) {
                callback()
            }
        }
    })
}

module.exports = {
    getAccessToken,
    saveAccessToken,
    ocrArtifactDetails,
    artifactsReset,
    expoetToClicpBoard
}