// Global variables
let marker = null;
let correctMarker = null;
let line = null;
let currentQuestion = 0;
let allGuesses = [];
let allMarkers = [];
let allLines = [];
let map, correctLocation, canGuess = true, totalScore = 0, roundsPlayed = 0;
let currentGuess = null;
let mapClickEnabled = true; // Added this line

// Timer variables
let startTime;
let timerInterval;
let elapsedTime = 0; // Track elapsed time in milliseconds
let timeLeft = 120000; // 2 minutes in milliseconds
const initialTime = 120000;

// Initial theme setup
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function updateTimer() {
    const currentTime = Date.now();
    elapsedTime = currentTime - startTime;
    timeLeft = initialTime - elapsedTime;

    if (timeLeft <= 0) {
        stopTimer();
        timeLeft = 0;
        handleTimeout();
    }

    const formattedTime = formatTime(timeLeft);
    document.getElementById('timer').textContent = formattedTime;
}

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function handleTimeout() {
    if (canGuess) {
        canGuess = false;
        const correctAnswer = questions[currentQuestion].answer;
        let userGuess = currentGuess;
        let distance = null; // Initialize distance to null

        if (!userGuess && marker) {
            userGuess = marker.getLatLng();
            distance = calculateDistance(userGuess.lat, userGuess.lng, correctAnswer[0], correctAnswer[1]);
        } else if (!userGuess) {
            userGuess = {lat: correctAnswer[0], lng: correctAnswer[1]};
            document.getElementById('distance').textContent = `-`;
        } else if (userGuess){
            distance = calculateDistance(userGuess.lat, userGuess.lng, correctAnswer[0], correctAnswer[1]);
        }


        allGuesses.push(userGuess);

        const nextButton = document.querySelector('.next-button');
        nextButton.style.display = 'block';
        document.getElementById('submit-guess').style.display = 'none';

        if (currentQuestion === questions.length - 1) {
            nextButton.textContent = 'See Results';
        } else {
            nextButton.textContent = 'Next Question';
        }

        let score = 0;

        if (distance !== null && marker) {
            score = Math.max(0, Math.round(4000 * (1 - distance/20000)));
            document.getElementById('distance').textContent = `Distance: ${Math.round(distance)} km`;
        }

        totalScore += score;
        document.getElementById('score').textContent = `Score: ${totalScore}`;
        showGuessAndCorrectLocation(userGuess, L.latLng(correctAnswer[0], correctAnswer[1]));
    }
}



// Questions array
const questions = [
    {
        question: "Where did the first manned powered flight take place?",
        answer: [35.2320, -75.6211],
        name: "Kitty Hawk, North Carolina, USA",
        image: "images/wright_flyer.jpg",
        info: "On December 17, 1903, the Wright brothers achieved the first manned powered flight in Kitty Hawk with their Wright Flyer."
    },
    {
        question: "Where was the first artificial satellite launched into space?",
        answer: [45.9200, 63.3420],
        name: "Baikonur Cosmodrome, Kazakhstan",
        image: "images/sputnik_launch.jpg",
        info: "On October 4, 1957, the Soviet Union launched Sputnik 1 from Baikonur Cosmodrome, marking the start of the space age."
    },
    {
        question: "Where was the first successful cloning of a mammal achieved?",
        answer: [56.4907, -3.1747],
        name: "Roslin Institute, Scotland",
        image: "images/dolly.jpg",
        info: "In 1996, scientists at the Roslin Institute in Scotland successfully cloned Dolly the sheep, the first mammal cloned from an adult cell."
    },
    {
        question: "Where was the first photograph ever taken?",
        answer: [47.8336, 4.5846],
        name: "Saint-Loup-de-Varennes, France",
        image: "images/first_photograph.jpg",
        info: "In 1826, Joseph Nicéphore Niépce captured the world's first permanent photograph, 'View from the Window at Le Gras,' in Saint-Loup-de-Varennes."
    },
    {
        question: "Where exactly was the Rosetta Stone discovered?",
        answer: [31.3960, 30.4170],
        name: "Fort Julien, Rosetta, Egypt",
        image: "images/rosetta_stone.jpg",
        info: "The Rosetta Stone was discovered in 1799 by French soldiers at Fort Julien near the town of Rosetta, Egypt, and later became key to deciphering hieroglyphics."
    }
];

// Icon definitions
const userIcon = L.divIcon({
    className: 'user-guess-pin',
    html: `
        <div class="pin-wrapper">
            <div class="pin-head"></div>
            <div class="pin-point"></div>
        </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

const correctIcon = L.divIcon({
    className: 'correct-pin',
    html: `
        <div class="fancy-plus">
            <div class="plus-circle">
                <span class="plus-icon">+</span>
            </div>
            <div class="pulse-ring"></div>
            <div class="pulse-ring delay"></div>
        </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25]
});

function initializeMap() {
    map = L.map('map', {
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: true,
        center: [20, 0],
        zoom: 2,
        wheelDebounceTime: 150,
        wheelPxPerZoomLevel: 120
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
    }).addTo(map);
    map.scrollWheelZoom.enable();
    map.on('click', handleGuess);
    let zoomTimeout;
    map.on('zoomend', () => {
        clearTimeout(zoomTimeout);
        zoomTimeout = setTimeout(() => {
            if (correctMarker) {
                updatePinSize(map, correctMarker);
                if (line) {
                    updateLine();
                }
            }
        }, 100); // Adjust the delay (in milliseconds) as needed
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function handleGuess(e) {
    if (!canGuess || !mapClickEnabled) return; // Modified this line

    const userGuess = e.latlng;
    currentGuess = userGuess;

    if (marker && map) {
        map.removeLayer(marker);
    }

    marker = L.marker([userGuess.lat, userGuess.lng], { icon: userIcon }).addTo(map);
    document.getElementById('submit-guess').style.display = 'block';
}

function showGuessAndCorrectLocation(userGuess, correctLatLng) {
    correctMarker = L.marker([correctLatLng.lat, correctLatLng.lng], {
        icon: correctIcon,
        interactive: true
    }).addTo(map);

    // Only create the line if there's a marker (user made a guess)
    if (marker) {
        const updateLine = () => {
            if (line) {
                map.removeLayer(line);
            }
            line = L.polyline([
                [userGuess.lat, userGuess.lng],
                [correctLatLng.lat, correctLatLng.lng]
            ], {
                color: '#7ac5f0',
                weight: 3,
                opacity: 0.8,
                smoothFactor: 1,
                dashArray: '10',
                className: 'animated-line'
            }).addTo(map);
        };
        updateLine();
    }

    const currentQuestionInfo = questions[currentQuestion];
    const popupContent = `
        <div class="location-info">
            <h3>${currentQuestionInfo.name}</h3>
            <img src="${currentQuestionInfo.image}" alt="${currentQuestionInfo.name}">
            <p>${currentQuestionInfo.info}</p>
        </div>
    `;
    const popup = L.popup({
        maxWidth: 300,
        autoPan: true,
        keepInView: true,
        autoPanPadding: [50, 50],
        offset: [0, -25],
        closeButton: true,
        autoClose: false,
        closeOnClick: false
    }).setContent(popupContent);
    correctMarker.bindPopup(popup);
    correctMarker.on('click', function(e) {
        const marker = this;
        marker.openPopup();

        setTimeout(() => {
            const popup = marker.getPopup();
            const px = map.project(popup.getLatLng());
            const popupHeight = popup.getElement().offsetHeight;
            const containerHeight = map.getContainer().offsetHeight;

            // Calculate required zoom level
            let currentZoom = map.getZoom();
            while (popupHeight > containerHeight * 0.8 && currentZoom > 2) {
                currentZoom--;
            }

            // Center and zoom the map
            map.setView(marker.getLatLng(), currentZoom, {
                animate: true,
                duration: 0.5,
                pan: {
                    animate: true,
                    duration: 0.5,
                    easeLinearity: 0.5
                }
            });
        }, 100);
    });
    const bounds = L.latLngBounds([
        [userGuess.lat, userGuess.lng],
        [correctLatLng.lat, correctLatLng.lng]
    ]);
    let padValue = 0.2;
    if (calculateDistance(userGuess.lat, userGuess.lng, correctLatLng.lat, correctLatLng.lng) > 5000) {
        padValue = 0.1;
    }
    if (calculateDistance(userGuess.lat, userGuess.lng, correctLatLng.lat, correctLatLng.lng) > 10000) {
        padValue = 0.05;
    }
    const extendedBounds = bounds.pad(padValue);
    map.fitBounds(extendedBounds, {
        padding: [50, 50],
        duration: 0.5,
        animate: true
    });
    setTimeout(() => {
        map.flyTo(correctLatLng, 12, {
            duration: 1,
            animate: true
        });
        setTimeout(() => {
            updateLine();
        }, 500);
    }, 600);
    map.off('click', handleGuess);
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();
    updatePinSize(map, correctMarker);
    map.on('zoomend', () => {
        updateLine();
        updatePinSize(map, correctMarker);
    });
}

function showAllGuessesOnMap() {
    const mapElement = document.getElementById('map');
    mapElement.style.height = 'calc(100vh - 100px)';
    if (marker) map.removeLayer(marker);
    if (correctMarker) map.removeLayer(correctMarker);
    if (line) map.removeLayer(line);
    allGuesses.forEach((guess, index) => {
        const question = questions[index];
        const userMarker = L.marker([guess.lat, guess.lng], { icon: userIcon }).addTo(map);
        const correctMarker = L.marker([question.answer[0], question.answer[1]], {
            icon: correctIcon,
            interactive: true
        }).addTo(map);
        const line = L.polyline([
            [guess.lat, guess.lng],
            [question.answer[0], question.answer[1]]
        ], {
            color: '#7ac5f0',
            weight: 3,
            opacity: 0.8,
            smoothFactor: 1,
            dashArray: '10',
            className: 'animated-line'
        }).addTo(map);
        const popupContent = `
            <div class="location-info">
                <h3>${question.name}</h3>
                <img src="${question.image}" alt="${question.name}">
                <p>${question.info}</p>
            </div>
        `;
        correctMarker.bindPopup(popupContent);
    });
    const allPoints = allGuesses.concat(questions.map(q => L.latLng(q.answer[0], q.answer[1])));
    const bounds = L.latLngBounds(allPoints);
    map.fitBounds(bounds, { padding: [50, 50] });
    const endScreen = document.getElementById('end-screen');
    const endContent = document.querySelector('.end-content');
    endContent.classList.add('minimized');
    endScreen.classList.add('minimized');
    const expandButton = document.createElement('button');
    expandButton.className = 'expand-button';
    expandButton.innerHTML = '<i class="fas fa-expand-alt"></i>';
    expandButton.onclick = () => {
        endContent.classList.remove('minimized');
        endScreen.classList.remove('minimized');
        expandButton.remove();
        mapElement.style.height = 'calc(100vh - 200px)';
        // Use requestAnimationFrame to ensure the height change is applied
        requestAnimationFrame(() => {
            // Use setTimeout to delay invalidateSize and re-enable interactions
            setTimeout(() => {
                map.invalidateSize();
                mapClickEnabled = true; // Re-enable map click
                // Re-enable map interactions
                map.dragging.enable();
                map.touchZoom.enable();
                map.doubleClickZoom.enable();
                map.scrollWheelZoom.enable();
                map.boxZoom.enable();
                map.keyboard.enable();
                if (map.tap) map.tap.enable();
                map.on('click', handleGuess); // Add the event listener back
            }, 0);
        });
    };
    endContent.appendChild(expandButton);
    mapElement.style.height = 'calc(100vh - 80px)'; // Set initial height for minimized state
    map.invalidateSize();
    // Re-enable map interactions after minimizing
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if(map.tap) map.tap.enable();
    mapClickEnabled = false; // Added this line
    // Disable map interactions
    map.off('click', handleGuess); // Remove the event listener
}

function shareResults() {
    const finalScore = totalScore;
    const averageDistance = allGuesses.reduce((acc, guess, index) => {
        const correctAnswer = questions[index].answer;
        return acc + calculateDistance(guess.lat, guess.lng, correctAnswer[0], correctAnswer[1]);
    }, 0) / questions.length;
    const accuracy = Math.max(0, 100 - (averageDistance / 100)).toFixed(1);
    const quizNumber = Math.floor(Math.random() * 100);
    const barLength = 10; // Fixed bar length
    let guessDetails = questions.map((question, index) => {
        const guess = allGuesses[index];
        const distance = Math.round(calculateDistance(guess.lat, guess.lng, question.answer[0], question.answer[1]));
        const maxDistance = 5000;
        const remainingDistance = Math.max(0, maxDistance - Math.min(distance, maxDistance));
        const progressPercentage = Math.round((remainingDistance / maxDistance) * 100);
        const filledLength = Math.round((progressPercentage / 100) * barLength);
        const gradientBar = '█'.repeat(filledLength) + '▓'.repeat(Math.max(0, barLength - filledLength));
        return `${index + 1}. ${distance}km ${gradientBar}`;
    }).join('\n');
    const shareText = `Daily Map Quiz #${quizNumber}\nFinal Score: ${finalScore}\nOverall Accuracy: ${accuracy}%\nTime: ${formatTime(elapsedTime)}\n\nDistances:\n${guessDetails}\n\nPlay now: ${window.location.href}`;
    if (navigator.share) {
        navigator.share({
            title: 'Daily Geo Quiz Results',
            text: shareText,
            url: window.location.href
        }).catch(() => {
            copyToClipboard(shareText);
        });
    } else {
        copyToClipboard(shareText);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => alert('Results copied to clipboard!'))
        .catch(() => alert('Unable to share results'));
}

function endGame() {
    stopTimer();
    const statsContainer = document.querySelector('.stats-container');
    const questionContainer = document.getElementById('question-container');
    const placeholder = document.createElement('div');
    placeholder.style.height = questionContainer.offsetHeight + 'px';
    placeholder.id = 'question-placeholder';
    questionContainer.parentNode.replaceChild(placeholder, questionContainer);
    statsContainer.style.display = 'none';
    const endScreen = document.getElementById('end-screen');
    const finalScore = document.getElementById('final-score');
    const finalStats = document.getElementById('final-stats');
    const finalTime = document.getElementById('final-time');

    let totalDistance = 0;
    let guessDetails = '';

    questions.forEach((question, index) => {
        const guess = allGuesses[index];
        let distance = null;
        if (guess) {
            distance = calculateDistance(guess.lat, guess.lng, question.answer[0], question.answer[1]);
        }
        
        totalDistance += distance === null ? 0 : distance;

        const maxDistance = 5000;
        const remainingDistance = distance === null ? 0 : Math.max(0, maxDistance - Math.min(distance, maxDistance));
        const progressPercentage = distance === null ? 0 : (remainingDistance / maxDistance) * 100;

        guessDetails += `
            <div class="guess-detail">
                ${index + 1}. Distance: ${distance === null ? '-' : Math.round(distance)} km |
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progressPercentage}%"></div>
                </div>
            </div>
        `;
    });

    const averageDistance = totalDistance / questions.length;
    const accuracy = Math.max(0, 100 - (averageDistance / 100));

    finalScore.textContent = `Final Score: ${totalScore}`;
    finalTime.textContent = `Time: ${formatTime(elapsedTime)}`;
    finalStats.innerHTML = `
        <div class="accuracy">Overall Accuracy: ${accuracy.toFixed(1)}%</div>
        <div class="guess-history">
            <h3>Your Guesses:</h3>
            ${guessDetails}
        </div>
    `;
    endScreen.style.display = 'flex';
    const endButtons = document.querySelector('.end-buttons');
    endButtons.innerHTML = `
        <button id="see-results-map" class="end-button">See Results on Map</button>
        <button id="share-results" class="end-button">Share Results</button>
    `;
    document.getElementById('see-results-map').addEventListener('click', showAllGuessesOnMap);
    document.getElementById('share-results').addEventListener('click', shareResults);
    mapClickEnabled = false;
}


function adjustQuestionFontSize() {
    const questionElement = document.getElementById('question');
    if (!questionElement) return;
    const textLength = questionElement.textContent.length;
    let fontSize = '1rem'; // Default font size
    if (textLength > 100) {
        fontSize = '0.8rem';
    } else if (textLength > 80) {
        fontSize = '0.9rem';
    }
    questionElement.style.fontSize = fontSize;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = localStorage.getItem('theme') === 'dark';

        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
     }
    const startGame = document.getElementById("start-game");
    if (startGame) {
        startGame.onclick = function() {
            console.log("Button clicked"); // Added console log
            const heroContainer = document.querySelector('.hero-container');
            const gameSection = document.getElementById('game-section');
            if (heroContainer && gameSection) {
                heroContainer.style.display = "none";
                gameSection.style.display = "block";
                initializeMap();
                document.getElementById("question").textContent = questions[currentQuestion].question;
                adjustQuestionFontSize(); // Call adjustQuestionFontSize here
                startTimer(); // Start the timer when the game starts
            }
        };
    }
    document.getElementById('submit-guess').addEventListener('click', function() {
        if (!currentGuess) return;

        canGuess = false;
        stopTimer(); // Stop the timer when the user submits
        const correctAnswer = questions[currentQuestion].answer;
        const distance = calculateDistance(currentGuess.lat, currentGuess.lng, correctAnswer[0], correctAnswer[1]);

        allGuesses.push(currentGuess);

        const nextButton = document.querySelector('.next-button');
        nextButton.style.display = 'block';
        this.style.display = 'none';

        if (currentQuestion === questions.length - 1) {
            nextButton.textContent = 'See Results';
        } else {
            nextButton.textContent = 'Next Question';
        }

        const score = Math.max(0, Math.round(4000 * (1 - distance/20000)));
        totalScore += score;

        document.getElementById('score').textContent = `Score: ${totalScore}`;
        document.getElementById('distance').textContent = `Distance: ${Math.round(distance)} km`;

        showGuessAndCorrectLocation(currentGuess, L.latLng(correctAnswer[0], correctAnswer[1]));
    });

document.querySelector('.next-button').addEventListener('click', function() {
    if (currentQuestion === questions.length - 1) {
        endGame();
        return;
    }
    currentQuestion++;
    canGuess = true;
    timeLeft = initialTime;
    
    // Reset markers and remove them from map
    if (marker) map.removeLayer(marker);
    if (correctMarker) map.removeLayer(correctMarker);
    if (line) map.removeLayer(line);
    
    marker = null;
    currentGuess = null;
    
    map.setView([20, 0], 2);
    map.on('click', handleGuess);
    document.getElementById('question').textContent = questions[currentQuestion].question;
    adjustQuestionFontSize();
    document.getElementById('distance').textContent = 'Distance: -';
    document.getElementById('score').textContent = 'Score: -';
    this.style.display = 'none';
    
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();
    
    mapClickEnabled = true;
    startTimer();
});


    const endScreen = document.getElementById('end-screen');
    if (endScreen) {
        const seeResultsBtn = endScreen.querySelector('#see-results-map');
        const shareResultsBtn = endScreen.querySelector('#share-results');

        if (seeResultsBtn) {
            seeResultsBtn.addEventListener('click', showAllGuessesOnMap);
        }

        if (shareResultsBtn) {
            shareResultsBtn.addEventListener('click', shareResults);
        }
    }
});

function adjustMapBounds(marker) {
    const bounds = marker.getBounds();
    const padding = 50; // Adjust padding as needed
    map.fitBounds(bounds.pad(0.1), {
        padding: [padding, padding],
        maxZoom: 18,
        animate: true,
        duration: 0.5
    });
}

