<template>
    <div>
        <a-layout id="my-layout">
            <a-layout-sider class="first-sider-color" v-model="collapsed" :trigger="null" collapsible>
                <!-- <div class="logo" /> -->
                <a-layout-header class="first-sider-color" style=" padding: 0">
                    <a-icon class="trigger" :type="collapsed ? 'menu-unfold' : 'menu-fold'"
                        @click="() => (collapsed = !collapsed)" />
                </a-layout-header>

                <a-menu class="first-sider-color" theme="dark" mode="inline" :default-selected-keys="['2']">
                    <!-- <a-menu-item key="1" @click="ClickMenu(1)">
                        <a-icon type="team" />
                        <span>角色界面</span>
                    </a-menu-item> -->
                    <a-menu-item key="2" @click="ClickMenu(2)">
                        <a-icon type="area-chart" />
                        <span>快捷地图</span>
                    </a-menu-item>
                    <a-menu-item key="3" @click="ClickMenu(3)">
                        <a-icon type="search" />
                        <span>用户查询</span>
                    </a-menu-item>
                    <a-menu-item key="4" @click="ClickMenu(4)">
                        <a-icon type="eye" />
                        <span>圣遗物导出</span>
                    </a-menu-item>
                    <a-menu-item key="5" @click="ClickMenu(5)">
                        <a-icon type="calculator" />
                        <span>莫娜占卜铺</span>
                    </a-menu-item>
                    <a-menu-item key="6" @click="ClickMenu(6)">
                        <a-icon type="setting" />
                        <span>程序设置</span>
                    </a-menu-item>
                    <a-menu-item key="7" @click="ClickMenu(7)">
                        <a-icon type="read" />
                        <span>帮助文档</span>
                    </a-menu-item>
                </a-menu>
                <popUpMenu></popUpMenu>
            </a-layout-sider>
            <a-layout>

                <a-layout-content id="second-content"
                    :style="{ margin: '0', padding: '0', background: '#fff', minHeight: '280px'}">
                    <router-view>Content</router-view>
                </a-layout-content>
            </a-layout>
        </a-layout>
    </div>

</template>
<script>
    const {
        ipcRenderer
    } = window.require("electron");

    import popUpMenu from './coms/PopUpMenu.vue'

    export default {
        data() {
            return {
                collapsed: true,


            };
        },
        mounted() {
            this.handleIPC()
        },
        components: {
            popUpMenu
        },
        methods: {
            ClickMenu(num) {
                switch (num) {
                    default:
                        break;
                    case 1:
                        // this.$router.push('/roleindex')
                        break

                    case 2:
                        this.$router.push('/gamemap')
                        break
                    case 3:
                        this.$router.push('/infoquery')
                        break
                    case 4:
                        this.$router.push('/artifactsexport')
                        break
                    case 5:
                        this.$router.push('/calculation')
                        break
                    case 6:
                        this.$router.push('/setting')
                        break
                    case 7:
                        this.$router.push('/documentation')
                }
            },

            handleIPC() {
                ipcRenderer.once("autoUpdateReady", () => {
                    this.$notification['success']({
                        message: '自动更新完成',
                        description: '下一次启动将是最新蹦蹦炸弹',
                        placement: 'bottomRight',
                        duration: 0,

                    });
                })
            }
        },

    };
</script>
<style scoped>
    .first-sider-color {
        background-color: #ce3c3c;
    }

    #my-layout {
        height: 100%;
        position: relative;
    }

    #my-layout .trigger {
        font-size: 18px;
        line-height: 64px;
        padding: 0 24px;
        cursor: pointer;
        transition: color 0.3s;
        color: #ffe0e0;
    }

    #my-layout .trigger:hover {
        color: #ffefef;
    }

    #my-layout .logo {
        height: 32px;
        background: rgba(255, 255, 255, 0.2);
        margin: 16px;
    }
</style>