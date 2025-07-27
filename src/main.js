import '@/assets/styles.scss';
import Aura from '@primeuix/themes/aura';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import Highcharts from 'highcharts'
import HighchartsVue from 'highcharts-vue'

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);
app.use(HighchartsVue);

app.use(router);
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        primary: 'azure',
        options: {
            darkModeSelector: '.app-dark'
        }
    }
});

app.use(ToastService);
app.use(ConfirmationService);

app.mount('#app');
