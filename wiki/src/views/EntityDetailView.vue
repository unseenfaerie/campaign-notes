<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import CollapseSection from '../components/CollapseSection.vue'
import FieldList from '../components/FieldList.vue'
import { entityLabelFromRoute } from '../config/entities'
import { ApiError } from '../services/apiClient'
import { getEntityFull, type DomainEntity } from '../services/domainService'

type FullState = {
  entity: DomainEntity
  related: Record<string, DomainEntity[]>
}

const props = defineProps<{
  entityRoute: string
  id: string
}>()

const loading = ref(true)
const errorMessage = ref('')
const fullData = ref<FullState | null>(null)

const entityTitle = computed(() => entityLabelFromRoute(props.entityRoute))

const sortedRelatedSections = computed(() => {
  if (!fullData.value) {
    return [] as Array<[string, DomainEntity[]]>
  }

  return Object.entries(fullData.value.related || {}).sort(([left], [right]) => left.localeCompare(right))
})

function stripMetaFields(record: DomainEntity): DomainEntity {
  const output: DomainEntity = {}

  for (const [key, value] of Object.entries(record)) {
    if (key === 'relationship' || key === 'history') {
      continue
    }

    output[key] = value
  }

  return output
}

function relationPayload(record: DomainEntity): DomainEntity {
  const candidate = record.relationship
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    return candidate as DomainEntity
  }

  return {}
}

function historyPayload(record: DomainEntity): DomainEntity[] {
  const candidate = record.history
  if (!Array.isArray(candidate)) {
    return []
  }

  return candidate.filter((entry): entry is DomainEntity => Boolean(entry && typeof entry === 'object'))
}

function relatedRecordLabel(record: DomainEntity): string {
  if (typeof record.name === 'string' && record.name.trim()) {
    return record.name
  }

  if (typeof record.alias === 'string' && record.alias.trim()) {
    return record.alias
  }

  if (record.id !== undefined && record.id !== null && record.id !== '') {
    return String(record.id)
  }

  return 'Related entry'
}

async function loadDetail() {
  loading.value = true
  errorMessage.value = ''

  try {
    fullData.value = await getEntityFull(props.entityRoute, props.id)
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Could not load detail view.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadDetail)
watch(() => [props.entityRoute, props.id], loadDetail)
</script>

<template>
  <section>
    <header class="view-header">
      <h2>{{ entityTitle }} Detail</h2>
      <p>Viewing {{ props.id }}</p>
    </header>

    <p v-if="loading" class="status-card">Loading entity detail...</p>
    <p v-else-if="errorMessage" class="status-card error">{{ errorMessage }}</p>

    <template v-else-if="fullData">
      <article class="status-card" style="margin-bottom: 1rem">
        <h3 style="margin-top: 0">Core Data</h3>
        <FieldList :data="fullData.entity" empty-message="No entity fields are available." />
      </article>

      <div class="section-stack">
        <CollapseSection
          v-for="[relatedRoute, records] in sortedRelatedSections"
          :key="relatedRoute"
          :title="entityLabelFromRoute(relatedRoute)"
          :count="records.length"
          :initially-open="records.length > 0"
        >
          <p v-if="records.length === 0" class="status-card">No related records in this section.</p>

          <div v-else class="section-stack">
            <article v-for="(record, index) in records" :key="`${relatedRoute}-${index}`" class="entity-card">
              <h3>{{ relatedRecordLabel(record) }}</h3>

              <FieldList :data="stripMetaFields(record)" empty-message="No direct fields." />

              <template v-if="Object.keys(relationPayload(record)).length > 0">
                <p class="meta-title">Relationship metadata</p>
                <FieldList :data="relationPayload(record)" />
              </template>

              <template v-if="historyPayload(record).length > 0">
                <p class="meta-title">History records</p>
                <div class="section-stack">
                  <article
                    v-for="(historyEntry, historyIndex) in historyPayload(record)"
                    :key="`${relatedRoute}-${index}-history-${historyIndex}`"
                    class="status-card"
                  >
                    <FieldList :data="historyEntry" />
                  </article>
                </div>
              </template>
            </article>
          </div>
        </CollapseSection>
      </div>
    </template>
  </section>
</template>
