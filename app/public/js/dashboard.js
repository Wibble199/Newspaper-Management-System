// ------------------- //
// Google Maps loader //
// ----------------- //
var gmapsApiLoad;
var googleMapsPromise = new Promise(function(resolve, reject) { gmapsApiLoad = resolve; });

// ----------------------- //
// Main data store (Vuex) //
// --------------------- //
var store = new Vuex.Store({
	state: {
		customers: []
	},

	mutations: {
		setCustomers: function(state, v) {
			state.customers = v;
		}
	},

	actions: {
		fetchCustomers: function(context) {
			setInterval(function() { // Async call to server to fetch data
				context.commit('setCustomers', [{
					id: 1,
					name: "John Smith",
					address1: "Some House",
					postcode: "AB12 3CD",
					email: "j.smith@gmail.com",
					subs: null
				}]);
			}, 1500);
		},

		fetchCustomerSubs: function(context, customer) {
			// customer.id
			setInterval(function() {
				customer.subs = [];
			}, 2000);
		}
	}
});

// --------------- //
// Vue components //
// ------------- //
var Overview = {
	template: '#route-view-overview',
	data:  function() { return {
	}}
};

var Routes = {
	template: '#route-view-driver-routes',
	data: function() { return {
		map: null
	}},

	mounted: function() {		
		googleMapsPromise.then(function() {
			this.map = new google.maps.Map($('#route-map').get(0), {
				center: {lat: 53.568731, lng: -2.885006},
				zoom: 13,
				disableDefaultUI: true
			});
		});
	}
};

var Customers = {
	template: '#route-view-customers',

	data: function() { return {
		selectedCustomerId: -1,
		selectedCustomer: null,
		searchText: ""
	}},

	computed: {
		filteredCustomers: function() {
			var thisVue = this;
			return thisVue.customers.filter(function(customer) {
				return customer.name.toLowerCase().indexOf(thisVue.searchText.toLowerCase()) > -1 ||
					customer.email.toLowerCase().indexOf(thisVue.searchText.toLowerCase()) > -1
			});
			return this.customers;
		},

		customers: function() { return store.state.customers; },
	},

	methods: {
		selectCustomer: function(e) {
			this.selectedCustomerId = $(e.target).closest('tr').data('customer-id');
			this.selectedCustomer = this.getCustomerById(this.selectedCustomerId);

			if (this.selectedCustomer.subs === null)
			 	store.dispatch('fetchCustomerSubs', this.selectedCustomer); // Lazy-load the customer's subscriptions
		},

		getCustomerById: function(id) {
			for (var i = 0; customer = this.customers[i]; i++)
				if (customer.id == id)
					return customer;
			return null;
		}
	}
};

var Publications = {
	template: '#route-view-publications',
	data: function() { return {
	}}
};

var Metrics = {
	template: '#route-view-metrics',
	data: function() { return {
	}}
};

// ------------- //
// Main Vue app //
// ----------- //
var router = new VueRouter({
	routes: [
		{path: "/", redirect: "/overview"},
		{path: "/overview", component: Overview},
		{path: "/routes", redirect: "/routes/1"},
		{path: "/routes/:driver", component: Routes},
		{path: "/customers", component: Customers},
		{path: "/publications", component: Publications},
		{path: "/metrics", component: Metrics}
	],

	linkActiveClass: "active"
});

var vm = new Vue({
	el: '#app',

	data: {
		user: {}
	},

	mounted: function() {
		this.fetchUser();
		store.dispatch('fetchCustomers');
	},

	methods: {
		fetchUser: function() {
			var thisVue = this;
			ajax('/user').then(function(d) {
				thisVue.user = d.user;
			});
		}
	},

	router: router
});