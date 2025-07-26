import { defineStore } from 'pinia'
import { apiClient } from '@/service/auth'

export const useInsurerStore = defineStore('insurer', {
  state: () => ({
    insurers: [],
    trashedInsurers: [],
    loading: false,
    error: null
  }),
  actions: {
    async fetchInsurers() {
      this.loading = true
      try {
        const response = await apiClient.get('/settings/insurers')
        this.insurers = response.data.data || []
      } catch (error) {
        this.error = error
        console.error('Erreur lors du chargement des assureurs:', error)
      } finally {
        this.loading = false
      }
    },

    async createInsurer(insurerData) {
      try {
        const response = await apiClient.post('/settings/insurers', insurerData)
        this.insurers.push(response.data.data)
      } catch (error) {
        console.error("Erreur lors de la création de l'assureur:", error)
        throw error
      }
    },

    async updateInsurer(updatedInsurer) {
      try {
        const response = await apiClient.put(`/settings/insurers/${updatedInsurer.id}`, updatedInsurer)
        const index = this.insurers.findIndex(i => i.id === updatedInsurer.id)
        if (index !== -1) {
          this.insurers.splice(index, 1, response.data.data)
        }
      } catch (error) {
        console.error("Erreur lors de la mise à jour de l'assureur:", error)
        throw error
      }
    },

    async deleteInsurer(id) {
      try {
        await apiClient.delete(`/settings/insurers/${id}`)
        this.insurers = this.insurers.filter(i => i.id !== id)
      } catch (error) {
        console.error("Erreur lors de la suppression de l'assureur:", error)
        throw error
      }
    },

    async fetchTrashedInsurers() {
      try {
        const response = await apiClient.get('/settings/insurers/trashed/get')
        this.trashedInsurers = response.data.data || []
      } catch (error) {
        console.error('Erreur lors du chargement de la corbeille:', error)
        throw error
      }
    },

    async restoreInsurer(id) {
      try {
        await apiClient.patch(`/settings/insurers/restore/${id}`)
        await this.fetchInsurers()
        this.trashedInsurers = this.trashedInsurers.filter(i => i.id !== id)
      } catch (error) {
        console.error("Erreur lors de la restauration de l'assureur:", error)
        throw error
      }
    }
  }
})
