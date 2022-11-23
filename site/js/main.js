

const map = L.map('map', {maxZoom: 22}).setView([39.925, -75.159], 16);

L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
	maxZoom: 22,
	attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
}).addTo(map);

const ListInput = document.querySelector('#list-filter');
const DateInput = document.querySelector('#date-filter');
const partySelect = document.querySelector('#party-filter');
const filteredCountSpan = document.querySelector('#filtered-count');
const filteredPrecinctSpan = document.querySelector('#filtered-precinct');
const neighborList = document.querySelector('.neighbors ul');

let neighborMarkers = {};
let neighborListItems = {};

const neighborMarkerGroup = L.layerGroup().addTo(map);
const mapboxApiToken = 'pk.eyJ1IjoidG9tZmlyZWdvZDE5OTkiLCJhIjoiY2xhdTVzczJvMDM0dTN3b3lwb3ZkaW56bCJ9.MQti0h1nMp0WLUeK8puKHQ';

const showNeighborMarker = function (marker) {
  const latlng = marker.getBounds()._southWest;
  map.panTo(latlng);
}

const handleNeighborListItemClick = function () {
  const neighborListItem = this;
  const neighborID = neighborListItem.dataset.neighborID;
  const address = neighborListItem.dataset.address;
  const lng = neighborListItem.dataset.longitude;
  const lat = neighborListItem.dataset.latitude;

  const marker = neighborMarkers[neighborID];
  if (marker) {
    showNeighborMarker(marker);
  }
}

const initNeighborListItems = function (data) {
  neighborListItems = {};
  neighborMarkerGroup.clearLayers();

  data.forEach(neighbor => {
    const neighborID = neighbor['Street Address'];
    const address = neighbor['Street Address'];

    const names = [];
    for (const resident of neighbor['Residents']) {
      const firstName = resident['First Name'];
      const middleName = resident['Middle Name'];
      const lastName = resident['Last Name'];

      names.push(`${firstName} ${middleName} ${lastName}`)
    }

    const lastVote = neighbor['Latest Vote Date'];
    const lng = neighbor['Longitude'];
    const lat = neighbor['Latitude'];

    const neighborListItem = htmlToElement(`
      <li class="neighbor">
        <span class="name">${names.join(', ')}</span>
        <span class="address">${address}</span>
        <span class="last-vote-date"><time value="${lastVote}">${lastVote || '(unknown last vote date)'}</time></span>
      </li>
    `);
    neighborListItem.dataset.address = address;
    neighborListItem.dataset.neighborID = neighborID;
    neighborListItem.dataset.longitude = lng || '';
    neighborListItem.dataset.latitude = lat || '';
    neighborListItem.addEventListener('click', handleNeighborListItemClick);

    if (lat && lng) {
      neighborMarkers[neighborID] = L.marker([lat, lng]).bindPopup(`${address}<br>${names.join(', ')}<br>${lastVote || '(unknown last vote date)'}`);
      neighborMarkerGroup.addLayer(neighborMarkers[neighborID]);
    }
    neighborListItems[neighborID] = neighborListItem;
  });
}

const getNeighborListItem = function (neighborID) {
  return neighborListItems[neighborID];
}

const updateNeighborList = function(data) {
  neighborList.innerHTML = '';

  data.forEach(neighbor => {
    const neighborListItem = getNeighborListItem(neighbor['Street Address']);
    neighborList.appendChild(neighborListItem);
  });

  filteredCountSpan.innerHTML = data.length;
}

const filterNeighborsData = function(data) {
  const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;

  const Date = DateInput.value;
  const party = partySelect.value;

  return data.filter(neighbor => {
    let lastVoteDate;

    if (neighbor['Last Vote Date']) {
      const voteDateComponents = datePattern.exec(neighbor['Last Vote Date']);
      const [, month, day, year] = voteDateComponents;
      lastVoteDate = `${year}-${month}-${day}`;
    }
    const neighborParty = neighbor['Party Code'];

    return (
      (!Date || lastVoteDate >= Date) &&
      (!party || neighborParty === party)
    );
  })
}

const showPrecinct = function (precinct) {
  fetch(`./data/voters_lists/${precinct}.csv`)
    .then(resp => {
      if (resp.status === 404) {
        alert(`No list "${precinct}" is available.`)
        throw new Error(`No data file for list "${precinct}"`)
      }
      return resp
    })
    .then(resp => resp.json())
    .then(data => {
      neighborsData = data;

      initNeighborListItems(neighborsData);
      filteredPrecinctSpan.innerHTML = precinct;
      const filteredData = filterNeighborsData(neighborsData);
      updateNeighborList(filteredData);
    });
}

const initPoliticalPartyOptions = function () {
  for (const party of politicalParties) {
    const partyOption = htmlToElement(`<option value="${party.code}">${party.name}</option>`);
    partySelect.appendChild(partyOption);
  }
}

handlePrecinctFilterChange = function () {
  const precinct = ListInput.value;
  showPrecinct(precinct);
}

handleDateFilterChange = function () {
  const filteredNeighbors = filterNeighborsData(neighborsData);
  updateNeighborList(filteredNeighbors);
}

handlePartyFilterChange = function () {
  const filteredNeighbors = filterNeighborsData(neighborsData);
  updateNeighborList(filteredNeighbors);
}

initPoliticalPartyOptions();
showPrecinct(3927);
ListInput.addEventListener('change', handlePrecinctFilterChange);
DateInput.addEventListener('change', handleDateFilterChange);
partySelect.addEventListener('change', handlePartyFilterChange);







