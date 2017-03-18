// ------------------- //
// Google Maps loader //
// ----------------- //
var gmapsApiLoad;
var googleMapsPromise = new Promise(function(resolve, reject) { gmapsApiLoad = resolve; });
var map, directionsRenderer;

// ----------------------- //
// Main data store (Vuex) //
// --------------------- //
var store = new Vuex.Store({
	state: {
		customers: [],

		deliveryDataRaw: null,
		directionsServiceResults: null
	},

	mutations: {
		setCustomers: function(state, v) { state.customers = v; },
		setDeliveryDataRaw: function(state, v) { state.deliveryDataRaw = v; },
		setDirectionsServiceResults: function(state, v) { state.directionsServiceResults = v; }
	},

	actions: {
		fetchCustomers: function(context) {
			ajax("/customers").then(data => { // Async call to server to fetch data
				if (data.success) {
					for (var i = data.results.length; i--;)
						data.results[i].subs = null; // Add holder for the user's subscriptions
					context.commit('setCustomers', data.results);
				}
			});
		},

		fetchRoutes: function(context) {
			var start = {lat: 53.562447, lng: -2.885611};
			var date = "2017-03-17";
			var directionsService;

			googleMapsPromise.then(function() {
				directionsService = new google.maps.DirectionsService();
				return ajax("/deliverylist/" + date);
			}).then(function(data) {
				if (!data.success) return Promise.reject(data.err);

				// For each driver, calculate a route with their waypoints
				var promises = [];
				context.commit("setDeliveryDataRaw", data.results);

				for (var i = 0; i < data.results.length; i++) { // Loop through all the driver arrays
					promises.push(new Promise(function(resolve, reject) { // Convert the directionsService calls into Promises

						// Strip out data such as name and get a list of locations for the Google DirectionsService
						var waypoints = [];
						for (var j = 0; delivery = data.results[i][j]; j++)
							waypoints.push({
								location: delivery.address1 + "," + delivery.postcode,
								stopover: true
							});

						// Call the DirectionsService route function to get an optimised route for this driver's deliveries				
						directionsService.route({
							origin: start,
							destination: start,
							travelMode: "DRIVING",
							waypoints: waypoints,
							optimizeWaypoints: true
						}, function(response, status) {
							if (status == "OK") resolve(response); // If all was good, resolve the promise
							else reject(status); // Else reject it
						});
					}));
				}
				return Promise.all(promises); // Return a Promise that will resolve when all driver's routes have been fetched

			}).then(function(responses) {
				context.commit("setDirectionsServiceResults", responses);
			});
		},

		fetchCustomerSubs: function(context, customer) {
			// customer.id
			ajax("/customers/" + customer.id + "/subscriptions").then(data => {
				if (data.success)
					customer.subs = data.results;
			});
		}
	}
});

// --------------- //
// Vue components //
// ------------- //
var Overview = {
	template: '#route-view-overview',

	computed: {

	},

	mounted: function() {
		new Chart($('#chart-weekly-subs-by-day').get(0), {
			type: "bar",
			data: {
				labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
				datasets: [{
					label: "You are FAKE news!",//"# of Publications",
					data: [64, 32, 16, 8, 4, 2, 1],
					backgroundColor: "rgba(51, 122, 183, 0.6)",
					borderColor: "rgba(51, 122, 183, 1)",
					borderWidth: 1
				}]
			},
			options: {
				scales: {
					yAxes: [{
						ticks: {
							beginAtZero:true
						}
					}]
				}
			}
		});

		new Chart($('#chart-weekly-subs-by-pub').get(0), {
			type: "doughnut",
			data: {
				labels: ["The Ormskirk Herlard", "The Guardian", "The Independent"],
				datasets: [{
					data: [64, 32, 16],
					backgroundColor: "rgba(51, 122, 183, 0.6)",
					borderColor: "rgba(51, 122, 183, 1)",
					borderWidth: 1
				}]
			}
		});
	}
};

var Routes = {
	template: '#route-view-driver-routes',

	computed: {
		currentDeliveryRoute: function() {
			return store.state.deliveryDataRaw ? store.state.deliveryDataRaw[this.$route.params.driver - 1] : null;
		},

		waypointOrder: function() {
			return store.state.directionsServiceResults ? store.state.directionsServiceResults[this.$route.params.driver - 1].routes[0].waypoint_order : null;
		}
	},

	watch: {
		'$route': function() { // Triggers when the route has a parameter change (I.E. when the driver is changed) but not when the route is changed to a different component.
			this.setMapDirections();
		}
	},

	mounted: function() {
		this.initialiseMap();
	},

	methods: {
		initialiseMap: function() {
			var thisVue = this;
			googleMapsPromise.then(function() {
				map = new google.maps.Map($('#route-map').get(0), {
					center: {lat: 53.568731, lng: -2.885006},
					zoom: 13,
					disableDefaultUI: true
				});

				directionsRenderer = new google.maps.DirectionsRenderer();
				directionsRenderer.setMap(map);
				thisVue.setMapDirections();
			});
		},

		setMapDirections: function() {
			directionsRenderer.setDirections(store.state.directionsServiceResults[this.$route.params.driver - 1]);
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
};

var Metrics = {
	template: '#route-view-metrics',
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
		store.dispatch('fetchRoutes');
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