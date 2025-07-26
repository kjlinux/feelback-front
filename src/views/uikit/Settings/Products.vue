<script setup>
import { apiClient } from '@/service/auth';
import { useSettings } from '@/service/useSettings';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const FilterMatchMode = {
    STARTS_WITH: 'startsWith',
    CONTAINS: 'contains',
    ENDS_WITH: 'endsWith',
    EQUALS: 'equals',
    NOT_EQUALS: 'notEquals',
    IN: 'in',
    LESS_THAN: 'lt',
    LESS_THAN_OR_EQUAL_TO: 'lte',
    GREATER_THAN: 'gt',
    GREATER_THAN_OR_EQUAL_TO: 'gte',
    BETWEEN: 'between',
    DATE_IS: 'dateIs',
    DATE_IS_NOT: 'dateIsNot',
    DATE_BEFORE: 'dateBefore',
    DATE_AFTER: 'dateAfter'
};

const router = useRouter();
const toast = useToast();
const dt = ref();

const { insurers, loading: loadingInsurers, fetchInsurers } = useSettings();

const products = ref([]);
const trashedProducts = ref([]);
const productDialog = ref(false);
const deleteProductDialog = ref(false);
const deleteProductsDialog = ref(false);
const showRestorationDialog = ref(false);
const product = ref({});
const selectedProducts = ref();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);
const filteredInsurers = ref([]);

onMounted(() => {
    loadProducts();
    fetchInsurers();
});

const loadProducts = async () => {
    try {
        const response = await apiClient.get('/settings/products');
        products.value = response.data.data || [];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les produits', life: 3000 });
        console.error('Erreur lors du chargement des produits:', error);
    }
};

const goBack = () => {
    router.back();
};

function openNew() {
    product.value = {
        commissionRate: 0.0
    };
    submitted.value = false;
    productDialog.value = true;
}

function hideDialog() {
    productDialog.value = false;
    submitted.value = false;
}

async function saveProduct() {
    submitted.value = true;

    if (product.value.name?.trim() && product.value.commissionRate !== undefined && product.value.id_insurers) {
        try {
            if (product.value.id) {
                const response = await apiClient.put(`/settings/products/${product.value.id}`, product.value);
                const updatedProduct = response.data.data || response.data;

                const index = findIndexById(product.value.id);
                if (index !== -1) {
                    products.value[index] = { ...updatedProduct };
                    products.value = [...products.value];
                }
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Produit mis à jour', life: 3000 });
            } else {
                const response = await apiClient.post('/settings/products', product.value);
                const newProduct = response.data.data || response.data;

                products.value = [...products.value, newProduct];
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Produit créé', life: 3000 });
            }

            productDialog.value = false;
            product.value = {};
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: error.response?.data?.message || "Une erreur est survenue lors de l'enregistrement",
                life: 3000
            });
            console.error("Erreur lors de l'enregistrement du produit:", error);
        }
    }
}

function editProduct(productData) {
    product.value = JSON.parse(JSON.stringify(productData));

    if (product.value.id_insurers && insurers.value) {
        const selectedInsurer = insurers.value.find((ins) => ins.id === product.value.id_insurers);
        if (selectedInsurer) {
            product.value.selectedInsurer = selectedInsurer;
        }
    }

    productDialog.value = true;
}

function confirmDeleteProduct(productData) {
    product.value = productData;
    deleteProductDialog.value = true;
}

async function deleteProduct() {
    try {
        await apiClient.delete(`/settings/products/${product.value.id}`);
        products.value = products.value.filter((val) => val.id !== product.value.id);
        deleteProductDialog.value = false;
        product.value = {};
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Produit supprimé', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la suppression',
            life: 3000
        });
        console.error('Erreur lors de la suppression du produit:', error);
    }
}

async function restoreProduct(productId) {
    try {
        await apiClient.patch(`/settings/products/restore/${productId}`);
        loadProducts();
        trashedProducts.value = trashedProducts.value.filter((product) => product.id !== productId);
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Produit restauré', life: 3000 });

        if (trashedProducts.value.length === 0) {
            showRestorationDialog.value = false;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la restauration',
            life: 3000
        });
        console.error('Erreur lors de la restauration du produit:', error);
    }
}

function findIndexById(id) {
    let index = -1;
    for (let i = 0; i < products.value.length; i++) {
        if (products.value[i].id === id) {
            index = i;
            break;
        }
    }
    return index;
}

function exportCSV() {
    dt.value.exportCSV();
}

function confirmDeleteSelected() {
    deleteProductsDialog.value = true;
}

async function deleteSelectedProducts() {
    try {
        for (const product of selectedProducts.value) {
            await apiClient.delete(`/settings/products/${product.id}`);
        }

        products.value = products.value.filter((val) => !selectedProducts.value.includes(val));
        deleteProductsDialog.value = false;
        selectedProducts.value = null;
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Produits supprimés', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Une erreur est survenue lors de la suppression des produits sélectionnés',
            life: 3000
        });
        console.error('Erreur lors de la suppression des produits:', error);
    }
}

async function showTrashedProducts() {
    try {
        const response = await apiClient.get('/settings/products/trashed/get');
        trashedProducts.value = response.data.data || [];
        showRestorationDialog.value = true;
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les produits supprimés',
            life: 3000
        });
        console.error('Erreur lors du chargement des produits supprimés:', error);
    }
}

function searchInsurersByName(event) {
    setTimeout(() => {
        if (!event.query.trim().length) {
            filteredInsurers.value = [...insurers.value];
        } else {
            filteredInsurers.value = insurers.value.filter((insurer) => {
                return insurer.name.toLowerCase().includes(event.query.toLowerCase());
            });
        }
    }, 250);
}

function formatCommissionRate(value) {
    return parseFloat(value).toFixed(2);
}

function findInsurerName(id) {
    if (!insurers.value) return 'Chargement...';
    const insurer = insurers.value.find((ins) => ins.id === id);
    return insurer ? insurer.name : 'Non défini';
}
</script>

<template>
    <div>
        <div class="card">
            <div class="p-3 border-gray-200 dark:border-gray-700">
                <div class="flex sm:flex-row justify-between">
                    <Button icon="pi pi-arrow-left" label="Retour aux paramètres" class="p-button-secondary p-button-sm" @click="goBack" />
                </div>
            </div>
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Nouveau" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                    <Button label="Supprimer" icon="pi pi-trash" severity="secondary" class="mr-2" @click="confirmDeleteSelected" :disabled="!selectedProducts || !selectedProducts.length" />
                    <Button label="Corbeille" icon="pi pi-replay" severity="secondary" @click="showTrashedProducts" />
                </template>

                <template #end>
                    <Button label="Exporter" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-model:selection="selectedProducts"
                :value="products"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} produits"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">Gestion des Produits</h4>
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Rechercher..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                <Column field="name" header="Nom" sortable style="min-width: 16rem"></Column>
                <Column field="commissionRate" header="Taux de commission (%)" sortable style="min-width: 12rem">
                    <template #body="slotProps"> {{ formatCommissionRate(slotProps.data.commissionRate) }} % </template>
                </Column>
                <Column field="id_insurers" header="Assureur" sortable style="min-width: 14rem">
                    <template #body="slotProps">
                        {{ findInsurerName(slotProps.data.id_insurers) }}
                    </template>
                </Column>
                <Column :exportable="false" style="min-width: 12rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editProduct(slotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteProduct(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="productDialog" :style="{ width: '550px' }" header="Détails du Produit" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="name" class="block font-bold mb-3">Nom du produit</label>
                    <InputText id="name" v-model.trim="product.name" required="true" autofocus :invalid="submitted && !product.name" fluid />
                    <small v-if="submitted && !product.name" class="text-red-500">Le nom du produit est obligatoire.</small>
                </div>

                <div>
                    <label for="commissionRate" class="block font-bold mb-3">Taux de commission (%)</label>
                    <InputNumber
                        id="commissionRate"
                        v-model="product.commissionRate"
                        required="true"
                        :invalid="submitted && (product.commissionRate === undefined || product.commissionRate === null)"
                        mode="decimal"
                        locale="fr-FR"
                        :minFractionDigits="2"
                        :maxFractionDigits="2"
                        min="0"
                        max="100"
                        fluid
                    />
                    <small v-if="submitted && (product.commissionRate === undefined || product.commissionRate === null)" class="text-red-500">Le taux de commission est obligatoire.</small>
                </div>

                <div>
                    <label for="insurer" class="block font-bold mb-3">Assureur</label>
                    <AutoComplete
                        id="insurer"
                        v-model="product.selectedInsurer"
                        :suggestions="filteredInsurers"
                        optionLabel="name"
                        dropdown
                        @complete="searchInsurersByName"
                        placeholder="Rechercher un assureur"
                        @item-select="(e) => (product.id_insurers = e.value.id)"
                        :invalid="submitted && !product.id_insurers"
                        fluid
                    />
                    <small v-if="submitted && !product.id_insurers" class="text-red-500">L'assureur est obligatoire.</small>
                </div>
            </div>

            <template #footer>
                <Button label="Annuler" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Enregistrer" icon="pi pi-check" @click="saveProduct" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteProductDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="product">
                    Êtes-vous sûr de vouloir supprimer <b>{{ product.name }}</b
                    >?
                </span>
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deleteProductDialog = false" />
                <Button label="Oui" icon="pi pi-check" @click="deleteProduct" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteProductsDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span>Êtes-vous sûr de vouloir supprimer les produits sélectionnés?</span>
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deleteProductsDialog = false" />
                <Button label="Oui" icon="pi pi-check" text @click="deleteSelectedProducts" />
            </template>
        </Dialog>

        <Dialog v-model:visible="showRestorationDialog" :style="{ width: '550px' }" header="Restaurer des produits" :modal="true">
            <div class="flex flex-col gap-4">
                <div v-if="trashedProducts.length === 0" class="text-center p-4">
                    <i class="pi pi-info-circle !text-3xl mb-3 block" />
                    <p>Aucun produit à restaurer</p>
                </div>
                <DataTable v-else :value="trashedProducts" dataKey="id">
                    <Column field="name" header="Nom"></Column>
                    <Column field="commissionRate" header="Taux de commission (%)">
                        <template #body="slotProps"> {{ formatCommissionRate(slotProps.data.commissionRate) }} % </template>
                    </Column>
                    <Column field="id_insurers" header="Assureur">
                        <template #body="slotProps">
                            {{ findInsurerName(slotProps.data.id_insurers) }}
                        </template>
                    </Column>
                    <Column style="width: 6rem">
                        <template #body="slotProps">
                            <Button icon="pi pi-replay" outlined rounded @click="restoreProduct(slotProps.data.id)" />
                        </template>
                    </Column>
                </DataTable>
            </div>
            <template #footer>
                <Button label="Fermer" icon="pi pi-times" text @click="showRestorationDialog = false" />
            </template>
        </Dialog>
    </div>
</template>
