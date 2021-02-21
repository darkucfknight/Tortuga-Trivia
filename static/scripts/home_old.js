let adminMode = 'host';
let gameMode = undefined;
let saveMode = 'create';

let viewUsed = true;

let currQuestionKey = null;

let categories = [];

const roundValues = new Array();
roundValues[0] = 1;
roundValues[1] = 2;
roundValues[2] = 3;

const pointValues = new Array();
pointValues[0] = 2;
pointValues[1] = 3;
pointValues[2] = 5;

const metrics = [];

let totalGroups = null;

const FIREBASE_REF = firebase.database().ref();
let gameModes = [];
let currSortedRef = null;
let currSubRef = null;
let provider = new firebase.auth.GoogleAuthProvider();

// Init Page
getTriviaTypes().then(function () {
    refreshGameMode(true);
});

function getTriviaTypes() {
    gameModes = [];
    return FIREBASE_REF.once('value', (snapshot) => {
        snapshot.forEach(function (child) {
            key = child.key;
            sortStrIndex = key.indexOf('Sorted');
            if (sortStrIndex > 0) {
                gameModes.push(key.substring(0, sortStrIndex));
            }
        });
        gameMode = gameModes[0];
    });
}

function getCategories() {
    return FIREBASE_REF.child(gameMode + 'Sorted').once('value', (snapshot) => {
        categories = [];
        snapshot.forEach(function (child) {
            if (child !== undefined) {
                categories.push(child.key);
            }
        });
    });
}

function initBasePanel() {
    var catDrop = document.getElementById('catDrop');
    catDrop.innerHTML = '';

    categories.forEach(function (cat) {
        var catOption = document.createElement('option');
        catOption.text = cat;
        catOption.id = cat;
        catDrop.add(catOption);
    });

    getSubCats(categories[0]);

    getMetrics();
}

function getMetrics() {
    var callsCompleted = 0;
    var gameModeRef;

    gameModeRef = firebase
        .database()
        .ref()
        .child(gameMode + 'Sorted');

    metrics.length = 0;

    categories.forEach(function (cat) {
        var catMetrics = [];
        catMetrics.catName = cat;
        catMetrics.metrics = [];
        var currCatRef = gameModeRef.child(cat);
        roundValues.forEach(function (round) {
            var currMetricRef = currCatRef.child(round);
            if (round == 3) {
                pointValues.forEach(function (point) {
                    var currMetricPointRef = currMetricRef.child(point);
                    var currMetricPointUnusedRef = currMetricPointRef
                        .orderByChild('Used')
                        .equalTo(viewUsed);
                    currMetricPointUnusedRef
                        .once('value')
                        .then(function (snapshot) {
                            callsCompleted++;
                            catMetrics.metrics.push(snapshot.numChildren());

                            //If 5 more calls completed, add new item to metrics
                            if (callsCompleted % 5 == 0) {
                                metrics.push(catMetrics);
                            }
                            //If all calls completed, draw
                            if (callsCompleted == totalGroups) {
                                drawMetrics();
                            }
                        });
                });
            } else {
                currMetricRef = currMetricRef
                    .orderByChild('Used')
                    .equalTo(viewUsed);
                currMetricRef.once('value').then(function (snapshot) {
                    callsCompleted++;
                    catMetrics.metrics.push(snapshot.numChildren());
                });
            }
        });
    });
}

function drawMetrics() {
    var metricsTable = document.getElementById('metricsTable');

    const redStyle = "style='background-color:#ff3333; text-align:center;'";
    const greenStyle = "style='background-color:#ccffeb; text-align:center'";

    metrics.forEach(function (metricObject) {
        var rowString = '';
        var newRow = metricsTable.insertRow(-1);

        rowString += '<td>' + metricObject.catName + '</td>';

        var i = 0;
        for (i = 0; i < 5; i++) {
            var threshhold = 5;
            if (i == 0) {
                threshhold = 3;
            }
            if (i == 1) {
                threshhold = 15;
            }

            rowString +=
                '<td ' +
                (metricObject.metrics[i] < threshhold ? redStyle : greenStyle) +
                '>' +
                metricObject.metrics[i] +
                '</td>';
        }

        newRow.innerHTML = rowString;
    });
}

function switchUsedMode() {
    viewUsed = !viewUsed;
    $('#switchUsedMode').html(viewUsed ? 'Used' : 'Unused');
    refreshGameMode(false);
}

function switchAdminMode() {
    var adminModeTitle = document.getElementById('adminMode');
    var getQuestionButton = document.getElementById('getQ');
    var markUsedButton = document.getElementById('usedButton');
    var allQuestionsTableRow = document.getElementById('questionsTableRow');
    var subCatTableDiv = document.getElementById('subCatTableDiv');

    if (adminMode == 'host') {
        $('#switchAdminMode').html('Host');
        getQuestionButton.style.display = 'none';
        markUsedButton.style.display = 'none';
        allQuestionsTableRow.style.display = 'block';
        subCatTableDiv.style.display = 'block';
        showHideInputs(true);
        getAllQuestion();
        adminMode = 'plan';
    } else {
        $('#switchAdminMode').html('Plan');
        getQuestionButton.style.display = 'block';
        markUsedButton.style.display = 'block';
        allQuestionsTableRow.style.display = 'none';
        subCatTableDiv.style.display = 'none';
        showHideInputs(false);
        adminMode = 'host';
    }
}

function advanceGameMode() {
    nextGameModeIdx = gameModes.indexOf(gameMode) + 1;
    gameMode =
        gameModes[nextGameModeIdx > gameModes.length - 1 ? 0 : nextGameModeIdx];
    $('#switchGameMode').html(gameMode);
}

function refreshGameMode(advance) {
    clearMetricsTable();
    if (advance) {
        advanceGameMode();
    }
    $('.question-attr').html('');

    getCategories(gameMode)
        .then(function () {
            currSortedRef = FIREBASE_REF.child(gameMode + 'Sorted');
            currSubRef = FIREBASE_REF.child(gameMode + 'Subcategories');
            return recalculateTotalGroups();
        })
        .then(function () {
            initBasePanel();
        });
}

function clearMetricsTable() {
    var metricsTable = document.getElementById('metricsTable');
    for (var i = metricsTable.rows.length - 1; i > 0; i--) {
        metricsTable.deleteRow(i);
    }
}

function recalculateTotalGroups() {
    totalGroups = categories.length * 2 + categories.length * 3;
}

function showHideInputs(create) {
    console.log('???');
    var questionCreation = document.getElementsByClassName('questionCreation');
    var questionDisplay = document.getElementsByClassName('question-attr');
    var i;

    for (i = 0; i < questionCreation.length; i++) {
        questionCreation[i].style.display = create ? 'block' : 'none';
        if (questionDisplay[i] != null) {
            questionDisplay[i].style.display = create ? 'none' : 'block';
        }
    }

    $('#saveQuestion').css('display', create ? 'inline-block' : 'none');
    $('#imgurFile').css('display', create ? 'inline-block' : 'none');
    $('#imgurReturnUrl').css('display', create ? 'inline-block' : 'none');
}

function showHide(value) {
    var pointDrop = document.getElementById('pointShowHide');
    var choiceDisplay = document.getElementById('choiceShowHide');
    if (value == 3) {
        pointDrop.style.display = 'inline-block';
    } else {
        pointDrop.style.display = 'none';
    }

    if (value == 2) {
        choiceDisplay.style.display = 'block';
    } else {
        choiceDisplay.style.display = 'none';
    }

    if (adminMode == 'plan') {
        getAllQuestion();
    }
}

function uploadToImgur() {
    var fileHolder = document.getElementById('imgurFile');
    if (fileHolder.files.length > 0) {
        var file = fileHolder.files[0];
        console.log('Uploading file to Imgur..');

        var apiUrl = 'https://api.imgur.com/3/image';
        var apiKey = 'bd8b8e4449a7795';

        var settings = {
            async: false,
            crossDomain: true,
            processData: false,
            contentType: false,
            type: 'POST',
            url: apiUrl,
            dataType: 'json',
            headers: {
                Authorization: 'Client-ID ' + apiKey,
                Accept: 'application/json',
            },
            mimeType: 'multipart/form-data',
        };

        var formData = new FormData();
        formData.append('image', fileHolder.files[0]);
        settings.data = formData;

        // Response contains stringified JSON
        // Image URL available at response.data.link
        $.ajax(settings).done(function (response) {
            $('#imgurReturnUrl').html(response.data.link);
            $('#questionInput').val(
                $('#questionInput').val() +
                    ' <a href="' +
                    response.data.link +
                    '">Pic</a>'
            );
        });
    }
}

function getSubCats(value) {
    var currSubCatRef = currSubRef.child(value).orderByChild('Subname');
    var subCatTable = document.getElementById('subCatTable');

    for (var i = subCatTable.rows.length - 1; i > -1; i--) {
        subCatTable.deleteRow(i);
    }

    var row = subCatTable.insertRow(-1);
    var numCell = 0;

    currSubCatRef.once('value').then(function (snapshot) {
        snapshot.forEach(function (data) {
            if (numCell == 7) {
                row = subCatTable.insertRow(-1);
                numCell = 0;
            }

            var newCell = row.insertCell(numCell);
            newCell.innerHTML = data.val().Subname;
            newCell.style.backgroundColor = data.val().used
                ? 'rgb(211, 228, 255)'
                : '#fff';
            newCell.onclick = markSubCatUsed;

            numCell++;
        });
    });

    getAllQuestion();
}

function markSubCatUsed(e) {
    var cat = document.getElementById('catDrop').value;
    var clickedSubName = e.target.innerHTML;

    e = e || window.event;
    var tdElm = e.target || e.srcElement;
    if (tdElm.style.backgroundColor == 'rgb(211, 228, 255)') {
        tdElm.style.backgroundColor = '#fff';
    } else {
        tdElm.style.backgroundColor = 'rgb(211, 228, 255)';
    }

    var currSubCatPlaceholder = currSubRef.child(cat);
    var currSubCatIndex = currSubRef
        .child(cat)
        .orderByChild('Subname')
        .equalTo(clickedSubName);

    currSubCatIndex.once('value').then(function (snapshot) {
        snapshot.forEach(function (data) {
            currSubCatPlaceholder
                .child(data.key)
                .update({ used: !data.val().used });
        });
    });
}

function markAllSubcatsUnused() {
    var cat = document.getElementById('catDrop').value;
    var currSubCatPlaceholder = currSubRef.child(cat);
    var currSubCatIndex = currSubRef.child(cat).orderByChild('Subname');

    currSubCatIndex.once('value').then(function (snapshot) {
        var numSubCats = snapshot.numChildren();
        var i = 0;
        snapshot.forEach(function (data) {
            i++;

            currSubCatPlaceholder.child(data.key).update({ used: false });

            if (i == numSubCats) {
                getSubCats(cat);
            }
        });
    });
}

function createNewSubCat() {
    var cat = document.getElementById('catDrop').value;
    var newSubCatName = document.getElementById('newSubCatName').value;

    var currSubCatPlaceholder = currSubRef.child(cat);
    currSubCatPlaceholder.push({
        Subname: newSubCatName,
        used: false,
    });

    getSubCats(cat);
    document.getElementById('newSubCatName').value = '';
}

function getQuestion() {
    var cat = $('#catDrop').val();
    var round = $('#roundDrop').val();
    var point = $('#pointDrop').val();

    var questionBlock = currSortedRef.child(cat).child(round);

    if (round == 3) {
        questionBlock = questionBlock.child(point);
    }

    questionBlock = questionBlock.orderByChild('Used').equalTo(viewUsed);

    questionBlock.once('value').then(function (snapshot) {
        var i = 0;
        if (!snapshot.exists()) {
            alert('Nothing to select! Write more questions!');
        }

        let randomQuestionNum = Math.floor(
            Math.random() * snapshot.numChildren()
        );

        let prevData = null;
        snapshot.forEach(function (data) {
            if (i == randomQuestionNum) {
                if (data.key == currQuestionKey) {
                    if (snapshot.numChildren() === 1) {
                        alert(
                            'Already viewing only question for this selection. Write some more!'
                        );
                    } else if (i == snapshot.numChildren() - 1) {
                        currQuestionKey = prevData.key;
                        showQuestion(prevData);
                    } else {
                        randomQuestionNum += 1;
                    }
                } else {
                    currQuestionKey = data.key;
                    showQuestion(data);
                }
            }
            prevData = data;
            i++;
        });
    });
}

function showQuestion(data) {
    // Clear fields so that there's no confusion
    $('.questionDisplay').html('');
    document.getElementById('question').innerHTML = data.val().Question;
    document.getElementById('choices').innerHTML = data.val().Multiple_Choice;
    document.getElementById('answer').innerHTML = data.val().Answer;
    document.getElementById('explanation').innerHTML = data.val().Explanation;
    document.getElementById('source').innerHTML = data.val().Source;

    usedButton = document.getElementById('usedButton');
    if (data.val().Used == '') {
        usedButton.innerHTML = 'Mark Used';
    } else {
        usedButton.innerHTML = 'Mark Unused';
    }
    usedButton.style.display = 'block';
}

function getAllQuestion() {
    var cat = document.getElementById('catDrop').value;
    var round = document.getElementById('roundDrop').value;
    var point = document.getElementById('pointDrop').value;
    var allQtable = document.getElementById('allQuestionsTable');

    var questionBlock = currSortedRef.child(cat).child(round);

    if (round == 3) {
        questionBlock = questionBlock.child(point);
    }

    // Clear AllQuestionsTable
    for (var i = allQtable.rows.length - 1; i > 0; i--) {
        allQtable.deleteRow(i);
    }

    questionBlock = questionBlock.orderByChild('Used').equalTo(viewUsed);

    questionBlock.once('value').then(function (snapshot) {
        var i = 0;
        if (!snapshot.exists()) {
            if (viewUsed) {
                alert('No Used Questions! Use more questions!');
            } else {
                alert('No Unused Questions! Write more questions!');
            }
        }

        snapshot.forEach(function (data) {
            var row = allQtable.insertRow(-1);
            row.onclick = () => editQuestion(data.key, data.val());
            row.key = data.key;

            var qCol = row.insertCell(0);
            var choiceCol = row.insertCell(1);
            var aCol = row.insertCell(2);

            qCol.innerHTML = data.val().Question;
            choiceCol.innerHTML = data.val().Multiple_Choice;
            aCol.innerHTML = data.val().Answer;
        });
    });
}

// TODO fix markused with duplicate names
function markUsed() {
    var cat = document.getElementById('catDrop').value;
    var round = document.getElementById('roundDrop').value;
    var point = document.getElementById('pointDrop').value;
    var question =
        adminMode == 'host'
            ? document.getElementById('question').innerHTML
            : $('#questionInput').val();
    var usedButton = document.getElementById('usedButton');

    // Create query
    var curDropState = currSortedRef.child(cat).child(round);

    if (round == 3) {
        curDropState = curDropState.child(point);
    }

    currQuestionQuery = curDropState.orderByChild('Question').equalTo(question);
    currQuestionQuery.once('value').then(function (snapshot) {
        snapshot.forEach(function (data) {
            curDropState.child(data.key).update({ Used: !data.val().Used });
            usedButton.innerHTML = data.val().Used
                ? 'Mark Used'
                : 'Mark Unused';

            var metricsTable = document.getElementById('metricsTable');
            for (var i = metricsTable.rows.length - 1; i > 0; i--) {
                metricsTable.deleteRow(i);
            }
            getMetrics();
        });
    });
}

function saveQuestion() {
    var cat = document.getElementById('catDrop');
    var round = document.getElementById('roundDrop');
    var point = document.getElementById('pointDrop');
    var question = document.getElementById('questionInput');
    var choices = document.getElementById('choicesInput');
    var answer = document.getElementById('answerInput');
    var explanation = document.getElementById('explanationInput');
    var source = document.getElementById('sourceInput');

    var questionRef = currSortedRef.child(cat.value).child(round.value);

    if (round.value == 3) {
        questionRef = questionRef.child(point.value);
    }

    if (saveMode == 'update') {
        questionRef = questionRef.child(currQuestionKey);

        questionRef.update(
            {
                Category: cat.value,
                Round: round.value,
                Points: point.value,
                Question: question.value,
                Multiple_Choice: choices.value,
                Answer: answer.value,
                Explanation: explanation.value,
                Source: source.value,
                Used: false,
            },
            function (error) {
                if (error) {
                    alert('Error adding question!');
                    console.log(error);
                } else {
                    showToast();
                    console.log('Success!');
                    question.value = '';
                    choices.value = '';
                    answer.value = '';
                    explanation.value = '';
                    source.value = '';

                    var metricsTable = document.getElementById('metricsTable');
                    for (var i = metricsTable.rows.length - 1; i > 0; i--) {
                        metricsTable.deleteRow(i);
                    }
                    getMetrics();
                    getAllQuestion();
                }
            }
        );
    } else {
        questionRef.push(
            {
                Category: cat.value,
                Round: round.value,
                Points: point.value,
                Question: question.value,
                Multiple_Choice: choices.value,
                Answer: answer.value,
                Explanation: explanation.value,
                Source: source.value,
                Used: false,
            },
            function (error) {
                if (error) {
                    alert('Error adding question!');
                    console.log(error);
                } else {
                    showToast();
                    console.log('Success!');
                    question.value = '';
                    choices.value = '';
                    answer.value = '';
                    explanation.value = '';
                    source.value = '';

                    var metricsTable = document.getElementById('metricsTable');
                    for (var i = metricsTable.rows.length - 1; i > 0; i--) {
                        metricsTable.deleteRow(i);
                    }
                    getMetrics();
                    getAllQuestion();
                }
            }
        );
    }
}

function showToast() {
    var x = document.getElementById('successToast');
    x.className = 'show';
    setTimeout(function () {
        x.className = x.className.replace('show', '');
    }, 3000);
}

function editQuestion(key, data) {
    saveMode = 'update';
    currQuestionKey = key;
    var markUsedButton = document.getElementById('usedButton');
    markUsedButton.style.display = 'block';

    $('#questionInput').val(data.Question);
    $('#choicesInput').val(data.Multiple_Choice);
    $('#answerInput').val(data.Answer);
    $('#explanationInput').val(data.Explanation);
    $('#sourceInput').val(data.Source);

    $('#saveQuestion').html('Update Question');
    $('#resetToCreate').show();
}

function resetToCreate() {
    saveMode = 'create';
    currQuestionKey = '';
    var markUsedButton = document.getElementById('usedButton');

    $('#questionInput').val('');
    $('#choicesInput').val('');
    $('#answerInput').val('');
    $('#explanationInput').val('');
    $('#sourceInput').val('');

    $('#saveQuestion').html('Create Question');
    markUsedButton.style.display = 'none';
    $('#resetToCreate').hide();
}

function googleSignin() {
    firebase
        .auth()

        .signInWithPopup(provider)
        .then(function (result) {
            var token = result.credential.accessToken;
            var user = result.user;
            getTriviaTypes().then(function () {
                refreshGameMode(true);
            });
        })
        .catch(function (error) {
            var errorCode = error.code;
            var errorMessage = error.message;
        });
}

function googleSignout() {
    firebase
        .auth()
        .signOut()

        .then(
            function () {
                console.log('Signout Succesfull');
            },
            function (error) {
                console.log('Signout Failed');
            }
        );
}

/*function addUsedFieldToSubCats() {
		categories.forEach(function(cat) {
			var currSubCatRef = currSubRef.child(cat);
			currSubCatRef.once('value').then(function(snapshot) {
				snapshot.forEach(function(child) {
					child.ref.update({
						used: false
					});
				});
			});
		})
	}*/

// OPTIMIZE DATA ORGANIZATION FOR FIREBASE
/*function sortDataIntoNewDB() {
		categories.forEach(function(cat) {
			var currCatRef = genRef.orderByChild('Category').equalTo(cat);
			var currCat = cat;
			console.log(currCat);
			currCatRef.on('value', function(snapshot) {
				snapshot.forEach(function(data) {
					if (data.val().Round == 1) {
						genSortedRef.child(currCat).child(data.val().Round).push({
							Answer: data.val().Answer,
							Category: data.val().Category,
							Explanation: data.val().Explanation,
							Question: data.val().Question,
							Round: data.val().Round,
							Source: data.val().Source,
							Used: data.val().Used === "" ? false : true
						})
					}
					else if (data.val().Round == 2) {
						genSortedRef.child(currCat).child(data.val().Round).push({
							Answer: data.val().Answer,
							Category: data.val().Category,
							Explanation: data.val().Explanation,
							Multiple_Choice: data.val().Multiple_Choice,
							Question: data.val().Question,
							Round: data.val().Round,
							Source: data.val().Source,
							Used: data.val().Used === "" ? false : true
						})
					}
					else {
						genSortedRef.child(currCat).child(data.val().Round).child(data.val().Points).push({
							Answer: data.val().Answer,
							Category: data.val().Category,
							Explanation: data.val().Explanation,
							Points: data.val().Points,
							Question: data.val().Question,
							Round: data.val().Round,
							Source: data.val().Source,
							Used: data.val().Used === "" ? false : true
						})
					}
				});
			});
		});
	}*/
// Generate Firebase rules string
/*function generateCategoryFirebaseRules() {
    let ruleString = '';
    let indentAmount = '      ';
    categories.forEach(function (cat) {
        ruleString += indentAmount + '"' + cat + '" : {\n';
        roundValues.forEach(function (round) {
            ruleString += indentAmount + '  "' + round + '" : {';
            if (round == 3) {
                ruleString += '\n';
                pointValues.forEach(function (point) {
                    ruleString +=
                        indentAmount +
                        '    "' +
                        point +
                        '":{".indexOn": "Used"},\n';
                });
                ruleString += indentAmount + '  },\n';
            } else {
                ruleString += '".indexOn": "Used"},\n';
            }
        });
        ruleString += indentAmount + '},\n';
    });
}*/
