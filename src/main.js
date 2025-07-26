import '@/assets/styles.scss';
import Aura from '@primeuix/themes/aura';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { createApp } from 'vue';
import App from './App.vue';
import PermissionDirective from './directives/permission';
import router from './router';
import Highcharts from 'highcharts'
import HighchartsVue from 'highcharts-vue'

// Import and initialize modules after Highcharts is loaded
// import HighchartsExporting from 'highcharts/modules/exporting'
// import HighchartsExportData from 'highcharts/modules/export-data'

// Initialize modules
// HighchartsExporting(Highcharts)
// HighchartsExportData(Highcharts)

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
    // locale: fr.fr
});

app.use(ToastService);
app.use(ConfirmationService);
app.use(PermissionDirective);

app.mount('#app');
