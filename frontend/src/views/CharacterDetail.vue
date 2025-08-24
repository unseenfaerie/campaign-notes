
<template>
	<div v-if="character" class="main-content">
		<div>
			<h1>{{ character.name }}</h1>
			<p><strong>Type:</strong> <span v-if="character.type == 'pc'">Player Character</span><span v-else>Non-Player Character</span></p>
			<p><strong>Class:</strong> {{ character.class }}</p>
			<p><strong>Level:</strong> {{ character.level }}</p>
			<p><strong>Alignment:</strong> {{ character.alignment }}</p>
			<p><strong>Strength:</strong> {{ character.strength }}</p>
			<p><strong>Dexterity:</strong> {{ character.dexterity }}</p>
			<p><strong>Constitution:</strong> {{ character.constitution }}</p>
			<p><strong>Intelligence:</strong> {{ character.intelligence }}</p>
			<p><strong>Wisdom:</strong> {{ character.wisdom }}</p>
			<p><strong>Charisma:</strong> {{ character.charisma }}</p>
			<p><strong>Total Health:</strong> {{ character.total_health }}</p>
			<p><strong>Deceased:</strong> <span v-if="character.deceased">Yes</span><span v-else>No</span></p>
			<p><strong>Short Description:</strong> {{ character.short_description }}</p>
			<p><strong>Long Explanation:</strong> {{ character.long_explanation }}</p>
		</div>

		<!-- Deities Section -->
		<section>
		<h2>Deities</h2>
		<ul v-if="deities && deities.length">
			<li v-for="deity in deities" :key="deity.deity_id">
				<strong>{{ deity.deity_id }}</strong>
				<span v-if="deity.short_description">: {{ deity.short_description }}</span>
			</li>
		</ul>
		<div v-else>No deities associated.</div>
		</section>

		<!-- Organizations Section -->
		<section>
		<h2>Organizations</h2>
		<ul v-if="organizations && organizations.length">
			<li v-for="org in organizations" :key="org.organization_id">
				<div>
					<strong>{{ org.organization_id }}</strong>
					<div>
						Joined: {{ org.joined_date }}<span v-if="org.left_date">, Left: {{ org.left_date }}</span>
						<span v-if="org.short_description"> - {{ org.short_description }}</span>
					</div>
				</div>
			</li>
		</ul>
		<div v-else>No organizations associated.</div>
		</section>

		<!-- Items Section -->
		<section>
		<h2>Items</h2>
		<ul v-if="items && items.length">
			<li v-for="item in items" :key="item.id || item.item_id">
				<div>
					<strong>{{ item.name }}</strong>
					<div>
						Acquired: {{ item.acquired_date }}<span v-if="item.relinquished_date">, Relinquished: {{ item.relinquished_date }}</span>
						<span v-if="item.short_description"> - {{ item.short_description }}</span>
					</div>
				</div>
			</li>
		</ul>
		<div v-else>No items associated.</div>
		</section>

		<!-- Events Section -->
		<section>
			<h2>Events</h2>
			<ul v-if="events && events.length">
				<li v-for="event in events" :key="event.event_id || event.id">
					{{ event.name || event.event_id }}<span v-if="event.short_description">: {{ event.short_description }}</span>
				</li>
			</ul>
			<div v-else>No events associated.</div>
		</section>

		<!-- Relationships Section -->
		<section>
		<h2>Relationships</h2>
		<ul v-if="relationships && relationships.length">
			<li v-for="rel in relationships" :key="rel.character_id + '-' + rel.related_id">
				With: {{ rel.character_id }} <span v-if="rel.relationship_type">({{ rel.relationship_type }})</span>
				<span v-if="rel.short_description"> - {{ rel.short_description }}</span>
			</li>
		</ul>
		<div v-else>No relationships associated.</div>
		</section>
	</div>
	<div v-else>
		Loading character...
	</div>
</template>

<script>

import { updateCharacter } from '../api/characters';

import {
	getFullCharacterById
} from '../api/characterAssociations';

export default {
	name: 'CharacterDetail',
	data() {
		return {
			character: null,
			editCharacter: null,
			saveStatus: null,
			isEditing: false,
			deities: [],
			organizations: [],
			items: [],
			events: [],
			relationships: []
		};
	},
	mounted() {
		this.fetchCharacter();
	},
	methods: {
		fetchCharacter() {
			const id = this.$route.params.id;
			getFullCharacterById(id)
				.then(data => {
					this.character = data;
					this.editCharacter = { ...data };
					this.deities = data.deities || [];
					this.organizations = data.organizations || [];
					this.items = data.items || [];
					this.relationships = data.relationships || [];
				})
				.catch(err => {
					console.error('Error fetching character:', err);
				});
		},
		startEdit() {
			this.editCharacter = { ...this.character };
			this.isEditing = true;
			this.saveStatus = null;
		},
		saveEdit() {
			const id = this.$route.params.id;
			const patchData = { ...this.editCharacter };
			updateCharacter(id, patchData)
				.then(() => {
					this.saveStatus = 'success';
					this.fetchCharacter();
					this.isEditing = false;
					setTimeout(() => { this.saveStatus = null; }, 2000);
				})
				.catch(() => {
					this.saveStatus = 'error';
					setTimeout(() => { this.saveStatus = null; }, 2000);
				});
		},
		cancelEdit() {
			this.editCharacter = { ...this.character };
			this.isEditing = false;
			this.saveStatus = null;
		}
	}
};
</script>
