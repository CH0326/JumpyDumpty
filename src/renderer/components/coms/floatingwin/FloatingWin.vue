<template>
    <div class="win-wrapper">
        <div id="header">
            <span v-if="ifReady">{{note}}</span>
            <span v-if="ifSuccess">{{detailName}}+{{level}}</span>
            <span v-if="!ifSuccess&&!ifReady">识别失败</span>
            <div id="header-right" v-if="ifSuccess">
                <span :key="i" v-for="(item,i) in star" style="color: rgba(0, 0, 0, 0.5);">★</span>
            </div>
        </div>

        <div class="div-line"><b></b></div>

        <div id="container">
            <div class="msg" v-if="!ifSuccess">{{msg}}</div>
            <div class="detail-msg" v-if="ifSuccess">
                <div class="main-info">
                    <div class="detail-name"></div>
                    <div class="postion">{{position}}</div>
                </div>

                <div class="second-info">
                    <div class="main-tag">{{mainTag.name}}+{{mainTag.value}}</div>
                    <div class="normal-tag" v-for="(item,i) in normalTags">{{item.name}}+{{item.value}}</div>
                    <div class="set-name">{{setName}}</div>

                </div>
            </div>
        </div>
    </div>
</template>

<script>
    const {
        ipcRenderer
    } = window.require("electron");

    export default {
        name: 'FloatingWin',
        data() {
            return {
                ifReady: true,
                ifSuccess: false,
                note: '热键已经开启',
                msg: '请点击鼠标以抓取圣遗物',
                level:'',
                star:'',
                detailName: '',
                setName: '',
                position: '',
                mainTag: {},
                normalTags: [],
            }
        },
        mounted() {
            this.handleIPC()
        },
        methods: {
            handleIPC() {
                ipcRenderer.removeAllListeners('OCRDetailNotification')
                ipcRenderer.on('OCRDetailNotification', (e, res) => {
                        console.log(res)
                        if (res.result == "success") {
                            this.ifSuccess = true
                            this.ifReady = false
                            this.level = res.level
                            this.star = res.star
                            this.detailName = res.detailName
                            this.position = res.position
                            this.mainTag = res.mainTag
                            this.normalTags = res.normalTags
                            this.setName = res.setName
                            console.log(this.normalTags)
                        } else {
                            this.ifReady = false
                            this.ifSuccess = false
                            this.msg = res.msg
                        }

                    }

                )
            }
        }
    };
</script>



<style scoped>
    * {
        margin: 0;
        padding: 0;
    }

    html,
    body {
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0);
    }

    .win-wrapper {
        width: calc(100% - 24px);
        height: calc(100% - 16px);
        margin-left: 8px;
        margin-top: 8px;
        font-family: -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Microsoft YaHei;
        /* background-color: #fff; */
        color: rgba(0, 0, 0, 0.85);
        padding: 40px;
        box-sizing: border-box;
        overflow: hidden;
        /* box-shadow: 1px 1px 8px rgb(211, 211, 211); */
        /* width:200px; */
        box-shadow: 0 5px 10px rgba(0, 0, 0, .25);
        border-radius: 2px;
        background-color: rgba(250, 250, 250, 0.98);
        /* box-shadow: 10px 10px 5px #888888; */
    }

    #header {
        font-size: 18px;
        line-height: 18px;
        width: 100%;
        position: relative;
    }
    #header-right{
        
        position: absolute;
        right: 0px;
        text-align: right;
    }
    #container {
        font-size: 14px;
        line-height: 22px;
        width: 100%;
    }

    .div-line {
        width: 63%;
    }

    .div-line b {
        background: #ddd;
        margin-bottom: 3px;
        display: inline-block;
        width: 180px;
        height: 1px;
        vertical-align: middle;
    }

    .main-tag {
        margin-top: 5px;
        margin-bottom: 5px;
        line-height: 24px;
        font-size: 16px;
        font-weight: 600;
    }

    .detail-name {
        font-size: 16px;


    }

    .postion {
        position: absolute;
        right: 0;
        text-align: right;
    }

    .main-info {
        position: relative;
        width: 100%;
    }

    .normal-tag {
        width: 100%;
    }

    .second-info {
        position: relative;
    }

    .set-name {
        position: absolute;
        right: 0;
        bottom: 0;
    }
</style>