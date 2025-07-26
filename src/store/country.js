import { defineStore } from 'pinia'
import { apiClient } from '@/service/auth'

export const useCountryStore = defineStore('country', {
  state: () => ({
    countries: [],
    trashedCountries: [],
    country: {},
    selectedCountries: [],
    dialogs: {
      country: false,
      deleteCountry: false,
      deleteCountries: false,
      restoration: false
    }
  }),
  actions: {
    async loadCountries() {
      try {
        const response = await apiClient.get('/settings/countries')
        this.countries = response.data.data || []
      } catch (error) {
        throw new Error('Erreur lors du chargement des pays')
      }
    },

    async saveCountry(countryData) {
      try {
        if (countryData.id) {
          const response = await apiClient.put(`/settings/countries/${countryData.id}`, countryData)
          const index = this.countries.findIndex(c => c.id === countryData.id)
          this.countries.splice(index, 1, response.data.data)
        } else {
          const response = await apiClient.post('/settings/countries', countryData)
          this.countries.push(response.data.data)
        }
      } catch (error) {
        throw new Error(error.response?.data?.message || 'Erreur lors de la sauvegarde')
      }
    },

    async deleteCountry(id) {
      try {
        await apiClient.delete(`/settings/countries/${id}`)
        this.countries = this.countries.filter(c => c.id !== id)
      } catch (error) {
        throw new Error('Erreur lors de la suppression')
      }
    },

    async loadTrashedCountries() {
      try {
        const response = await apiClient.get('/settings/countries/trashed/get')
        this.trashedCountries = response.data.data || []
      } catch (error) {
        throw new Error('Erreur lors du chargement de la corbeille')
      }
    },

    async restoreCountry(id) {
      try {
        await apiClient.patch(`/settings/countries/restore/${id}`)
        await this.loadCountries()
        this.trashedCountries = this.trashedCountries.filter(c => c.id !== id)
      } catch (error) {
        throw new Error('Erreur lors de la restauration')
      }
    }
  }
})
