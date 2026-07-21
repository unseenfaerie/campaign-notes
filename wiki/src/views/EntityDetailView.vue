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
const entityPageTitle = computed(() => {
  const entity = fullData.value?.entity
  if (!entity) {
    return loading.value ? 'Loading...' : entityTitle.value
  }

  if (typeof entity.name === 'string' && entity.name.trim()) {
    return entity.name
  }

  if (typeof entity.alias === 'string' && entity.alias.trim()) {
    return entity.alias
  }

  return entityTitle.value
})

const entityDisplayData = computed(() => withoutIdField(fullData.value?.entity || {}))

const sortedRelatedSections = computed(() => {
  if (!fullData.value) {
    return [] as Array<[string, DomainEntity[]]>
  }

  return Object.entries(fullData.value.related || {})
    .filter(([, records]) => Array.isArray(records) && records.length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
})

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

function withoutIdField(record: DomainEntity): DomainEntity {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'id'))
}

function relationDisplayPayload(record: DomainEntity): DomainEntity {
  return withoutIdField(relationPayload(record))
}

function historyDisplayPayload(record: DomainEntity): DomainEntity[] {
  return historyPayload(record).map(withoutIdField).filter((entry) => Object.keys(entry).length > 0)
}

function relatedRecordLabel(record: DomainEntity): string {
  if (typeof record.name === 'string' && record.name.trim()) {
    return record.name
  }

  if (typeof record.alias === 'string' && record.alias.trim()) {
    return record.alias
  }

  return 'Related entry'
}

function relatedRecordId(record: DomainEntity): string {
  if (record.id === undefined || record.id === null || record.id === '') {
    return ''
  }

  return String(record.id)
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
      <h1>{{ entityPageTitle }}</h1>
    </header>

    <p v-if="loading" class="status-card">Loading entity detail...</p>
    <p v-else-if="errorMessage" class="status-card error">{{ errorMessage }}</p>

    <article v-else-if="fullData" class="wiki-article">
      <section>
        <h3>Core data</h3>
        <FieldList :data="entityDisplayData" empty-message="No entity fields are available." />
      </section>

      <CollapseSection
        v-for="[relatedRoute, records] in sortedRelatedSections"
        :key="relatedRoute"
        class="article-section"
        :title="entityLabelFromRoute(relatedRoute)"
        :count="records.length"
        :initially-open="false"
      >
        <div>
          <article v-for="(record, index) in records" :key="`${relatedRoute}-${index}`" class="related-record">
            <h4>
              <RouterLink
                v-if="relatedRecordId(record)"
                :to="{
                  name: 'entity-detail',
                  params: { entityRoute: relatedRoute, id: relatedRecordId(record) },
                }"
              >
                {{ relatedRecordLabel(record) }}
              </RouterLink>
              <template v-else>{{ relatedRecordLabel(record) }}</template>
            </h4>

            <template v-if="Object.keys(relationDisplayPayload(record)).length > 0">
              <FieldList :data="relationDisplayPayload(record)" />
            </template>

            <template v-if="historyDisplayPayload(record).length > 0">
              <p class="meta-title">History records</p>
              <article
                v-for="(historyEntry, historyIndex) in historyDisplayPayload(record)"
                :key="`${relatedRoute}-${index}-history-${historyIndex}`"
                class="history-record"
              >
                <FieldList :data="historyEntry" />
              </article>
            </template>

            <p
              v-if="Object.keys(relationDisplayPayload(record)).length === 0 && historyDisplayPayload(record).length === 0"
              class="article-note"
            >
              No relationship metadata or history records for this entry.
            </p>
          </article>
        </div>
      </CollapseSection>
    </article>
  </section>
</template>
