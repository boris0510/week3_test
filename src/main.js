import { createApp } from 'vue';
import axios from 'axios';
import VueAxios from 'vue-axios';
import Loading from 'vue3-loading-overlay';
import 'vue3-loading-overlay/dist/vue3-loading-overlay.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import App from './App.vue';
import router from './router';
import emitter from './tools/mitt';

const app = createApp(App);
app.use(VueAxios, axios);
app.config.globalProperties.emitter = emitter;
app.use(router);
app.component('Loading', Loading);
app.mount('#app');
