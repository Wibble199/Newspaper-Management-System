// ------------------- //
// Google Maps loader //
// ----------------- //
var gmapsApiLoad;
var googleMapsPromise = new Promise(function(resolve, reject) { gmapsApiLoad = resolve; });
var map, directionsService, directionsRenderer;

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
		directionsServiceResults: null
	}},

	watch: {
		'$route': function() { // Triggers when the route has a parameter change (I.E. when the driver is changed) but not when the route is changed to a different component.
			this.setMapDirections(this.$route.params.driver - 1);
		}
	},

	mounted: function() {
		thisVue = this;

		googleMapsPromise.then(function() {
			map = new google.maps.Map($('#route-map').get(0), {
				center: {lat: 53.568731, lng: -2.885006},
				zoom: 13,
				disableDefaultUI: true
			});

			directionsService = new google.maps.DirectionsService();
			directionsRenderer = new google.maps.DirectionsRenderer();
			directionsRenderer.setMap(map);

			var start = {lat: 53.562447, lng: -2.885611};

			$('#route-view-inner-container').loadingOverlay(true);
			
			ajax("/test").then(function(data) {
				var promises = [];
				for (var i = 0; i < data.results.length; i++) {
					promises.push(new Promise(function(resolve, reject) {
						directionsService.route({
							origin: start,
							destination: start,
							travelMode: "DRIVING",
							waypoints: data.results[i],
							optimizeWaypoints: true
						}, function(response, status) {
							if (status == "OK") resolve(response);
							else reject(status);
						});
					}));
				}

				return Promise.all(promises);

			}).then(function(responses) {
				thisVue.directionsServiceResults = responses;
				thisVue.setMapDirections(0);

				$('#route-view-inner-container').loadingOverlay(false);
			});
		});
	},

	methods: {
		setMapDirections: function(driverIndex) {
			directionsRenderer.setDirections(this.directionsServiceResults[driverIndex]);
		}	
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