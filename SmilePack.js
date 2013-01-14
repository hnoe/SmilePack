// ========================================================================
// Smile Pack v1.1
// http://sp.hnoe.ru
// ========================================================================
// Copyright 2012 hnoe
// Email: hnoe@hnoe.ru
//
// Licensed under the GNU GPLv2
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at:
//
// http://www.gnu.org/licenses/gpl2.txt
// ========================================================================

(function (window) {
	"use strict";

	var document = window.document,
		location = window.location,
		localStorage = window.localStorage,

		sml = document.getElementById("sml"), //////////////////// контейнер со смайликами
		set = document.getElementById("set"), //////////////////// контейнер для пользовательских смайликов
		libs = document.getElementById("libs"), ////////////////// библиотеки смайликов
		libsArr = libs.getElementsByTagName("li"), /////////////// библиотеки в массиве
		libsBorder = document.getElementById("libsBorder"), ////// видимая часть библиотек
		libsFreeze = document.getElementById("libsFreeze"), ////// кнопка заморозки окна с библиотеками
		bookmarklet = document.getElementById("bookmarklet"), //// контейнер с кнопками
		smilePack = document.getElementById("smilePack"), //////// букмарклет Smile Pack
		create = document.getElementById("create"), ////////////// кнопка создания пользовательской директории
		directories = document.getElementById("directories"), //// кнопка просмотра пользовательских директорий
		totalSml = document.getElementById("totalSml"), ////////// отображает кол-во элементов в set
		help = document.getElementById("help"), ////////////////// кнопка помощь ("HELP")
		donate = document.getElementById("donate"), ////////////// кнопка для пожертвований
		otherVersion = document.getElementById("otherVersion"), // ссылка переключения версий

		dragObject = {}, ///////////////////////////////////////// объект для drag-n-drop
		limit = 40, ////////////////////////////////////////////// допустимое кол-во элементов в set
		sessionCache = {}, /////////////////////////////////////// временный кеш (сохраняет видоизменненный sml)
		lib = libsArr[0].innerHTML, ////////////////////////////// активная библиотека в libs
		regExIMG = /[\w\-]+\/[\w\-]+\.gif$/i, //////////////////// для фильтрации url
		loadFlag = false, //////////////////////////////////////// флаг при загрузке смайликов

		tooltip = {
			directories: "У тебя пока еще нет директорий! Попробуй создать ее!",
			create     : "Сначала выбери смайлики и перемести их в область сверху!",
			smilePack  : "Это надо сохранить в закладках. Просто перетащи это в закладки!"
		},


///////////////////////////////////////////Функции кроссбраузерности приложения/////////////////////////////////////////
	// Event
		fixEvent = function (e) {
			e = e || window.event;

			if (!e.target) {
				e.target = e.srcElement;
			}

			if (e.pageX == null && e.clientX != null) { // если нет pageX..
				var html = document.documentElement,
					body = document.body;

				e.pageX = e.clientX + (html.scrollLeft || body && body.scrollLeft || 0);
				e.pageX -= html.clientLeft || 0;

				e.pageY = e.clientY + (html.scrollTop || body && body.scrollTop || 0);
				e.pageY -= html.clientTop || 0;
			}

			if (!e.which && e.button) {
				e.which = e.button & 1 ? 1 : ( e.button & 2 ? 3 : ( e.button & 4 ? 2 : 0 ) );
			}

			return e;
		},

	// Вызов события
		addEvent = function (target, type, handler) {
			if (target.addEventListener) {
				target.addEventListener(type, handler, false);
			} else {
				target.attachEvent("on" + type, function (event) {
					return handler.call(target, event);
				});
			}
		},

	// Координаты элемента
		getCoords = function (elem) {
			var box = elem.getBoundingClientRect(),
				body = document.body,
				docElem = document.documentElement,

				scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop,
				scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft,

				clientTop = docElem.clientTop || body.clientTop || 0,
				clientLeft = docElem.clientLeft || body.clientLeft || 0,

				top = box.top + scrollTop - clientTop,
				left = box.left + scrollLeft - clientLeft;

			return { top: Math.round(top), left: Math.round(left) };
		},


//////////////////////////////////////////Дополнительные функции для приложения/////////////////////////////////////////
	// Определяет и возвращает элемент под переносимым объектом
		getElementUnderClientXY = function (elem, clientX, clientY) {
			var display = elem.style.display || "",
				target;

			elem.style.display = "none";

			target = document.elementFromPoint(clientX, clientY);

			elem.style.display = display;

			if (target.parentNode.id === "set" || target.id === "set") {
				return set;
			}

			return sml;
		},

	// Открывает подсказки с #tooltip
		giveTooltip = function (text, element) {
			if (!document.getElementById("tooltip")) {
				totalSml.style.display = "none";
				var elem = document.createElement("div"),
					opacity = 1,
					interval;
				elem.id = "tooltip";
				elem.innerHTML = text;
				bookmarklet.appendChild(elem);

				element.onmouseout = function () {
					if (interval) {
						return;
					}
					interval = window.setInterval(function () {
						opacity -= 0.01;
						elem.style.opacity = opacity;
						if (opacity < 0.3) {
							elem.parentNode.removeChild(elem);
							totalSml.style.display = "";
							window.clearInterval(interval);
						}
					}, 10);
				};
			}
		},

	// Открывает/закрывает сообщения c #message
		switchMessage = function (content) {
			var back = document.getElementById("back");
			if (back) {
				back.parentNode.removeChild(back);
				document.body.style.overflow = "";
				return;
			}

			back = document.createElement("div");
			back.id = "back";

			// если есть элемент
			if (content) {
				back.appendChild(content);
			}

			document.body.appendChild(back);
			document.body.style.overflow = "hidden";
		},


////////////////////////////////////////////Drag - n - Drop/////////////////////////////////////////////////////////////
	// Дополнительные функциии для Drag - n - Drop
	// createAvatar() - создает аватар, возвращает в случае отмены переноса
	// startDrag() - измениет стиль переносимого элемента
		createAvatar = function () {
			// запомнить старые свойства, чтобы вернуться к ним при отмене переноса
			var avatar = dragObject.elem,
				old = {
					parent     : avatar.parentNode,
					nextSibling: avatar.nextSibling,
					className  : dragObject.elem.className || ""
				};

			// функция для отмены переноса
			avatar.rollback = function () {
				old.parent.insertBefore(avatar, old.nextSibling);
				avatar.style.cssText = "";
				avatar.className = old.className;
			};

			return avatar;
		},
		startDrag = function () {
			var avatar = dragObject.avatar;

			// инициировать начало переноса
			document.body.appendChild(avatar);
			avatar.className = "active";
		},

	// Основые функции для Drag - n - Drop
	// dragDown() - нажали
	// dragMove() - перетащили
	// dragUp() - отпустили
		dragDown = function (e) {
			e = fixEvent(e);

			if (e.which !== 1 || e.target.className !== "imgs") {
				return;
			}

			dragObject.elem = e.target;

			// текущий родитель переносимого элемента
			dragObject.parentElem = e.target.parentNode;

			// запомним, что элемент нажат на текущих координатах pageX/pageY
			dragObject.downX = e.pageX;
			dragObject.downY = e.pageY;
		},
		dragMove = function (e) {
			// элемент не зажат
			if (!dragObject.elem) {
				return;
			}

			e = fixEvent(e);

			if (!dragObject.avatar) { // если перенос не начат...
				var moveX = e.pageX - dragObject.downX,
					moveY = e.pageY - dragObject.downY,
					coords;

				if (Math.abs(moveX) < 3 && Math.abs(moveY) < 3) {
					return;
				}

				// если мышь передвинулась в нажатом состоянии достаточно далеко:
				dragObject.avatar = createAvatar(); // создать аватар
				if (!dragObject.avatar) { // отмена переноса, нельзя "захватить" за эту часть элемента
					dragObject = {};
					return;
				}

				// аватар создан успешно
				// создать вспомогательные свойства shiftX/shiftY
				coords = getCoords(dragObject.avatar);
				dragObject.shiftX = dragObject.downX - coords.left;
				dragObject.shiftY = dragObject.downY - coords.top;

				startDrag(); // отобразить начало переноса
			}

			// отобразить перенос объекта при каждом движении мыши
			dragObject.avatar.style.left = e.pageX - dragObject.shiftX + "px";
			dragObject.avatar.style.top = e.pageY - dragObject.shiftY + "px";

		},
		dragUp = function (e) {
			e = fixEvent(e);

			if (dragObject.avatar) {
				if (!e.target.parentNode || e.target.parentNode.tagName === undefined) {
					dragObject.avatar.rollback();
				} else {
					//возвращает элемент set или sml
					var cont = getElementUnderClientXY(dragObject.avatar, e.clientX, e.clientY);

					// действие не завершилось или предельно допустимое количество в set
					if (dragObject.parentElem === cont || set.childNodes.length === limit) {
						dragObject.avatar.rollback();
					} else {
						if (cont === set || cont === sml) {
							dragObject.avatar.style.cssText = "";
							dragObject.avatar.className = "imgs";
							cont.appendChild(dragObject.avatar);
						}
					}
				}

				dragObject = {};

				if (set.firstChild) {
					if (set.childNodes.length === limit) {
						totalSml.className = "active";
						totalSml.innerHTML = "Смайликов: " + set.childNodes.length + ". " + "Нажми \"создать\"!";
					} else {
						totalSml.className = "";
						totalSml.innerHTML = "Смайликов: " + set.childNodes.length + "/" + limit;
					}
					create.className = "active";
				} else {
					create.className = "";
					totalSml.innerHTML = "";
				}
			}

			// срабатывает если dragMove не сработал
			if (dragObject.elem) {
				dragObject = {};
			}
		},


//////////////////////////////////////////////////////CREATE////////////////////////////////////////////////////////////
	// Сохраняет директорию (create)
		savingDirectory = function (oldMessage, value) {
			var message = document.createElement("div"),
				p = document.createElement("p"),
				input = document.createElement("input"),
				setList = set.childNodes,
				editSetList = [],
				i,
				len;

			message.id = "mCreate";
			p.innerHTML = "<b>Удачное сохранение!</b><br>" +
				"Новая директория: " + value + ". Количество смайликов: " + setList.length + ".";
			p.className = "mCreateP";
			input.type = "button";
			input.id = "mCreateOk";
			input.value = "OK";

			message.appendChild(p);
			message.appendChild(input);

			for (i = 0, len = setList.length; i < len; i += 1) {
				editSetList[i] = setList[i].src.match(regExIMG);
			}
			localStorage[value] = JSON.stringify(editSetList);

			oldMessage.parentNode.replaceChild(message, oldMessage);

			input.onclick = function () {
				switchMessage();
				location.reload();
			};
		},

	// Заменяет элементы в дублирующей директории (create)
		replaceDuplicateDirectory = function (oldMessage, input) {
			var message = document.createElement("message"),
				p = document.createElement("p"),
				inputYes = document.createElement("input"),
				inputNo = document.createElement("input");

			message.id = "mCreate";
			p.innerHTML = "Имя <b> " + input.value + "</b> уже используется!<br>" +
				"Заменить его?";
			p.className = "mCreateP";
			inputYes.type = "button";
			inputYes.id = "mCreateReplaceYes";
			inputYes.value = "Да";
			inputNo.type = "button";
			inputNo.id = "mCreateReplaceNo";
			inputNo.value = "Нет";

			message.appendChild(p);
			message.appendChild(inputYes);
			message.appendChild(inputNo);

			oldMessage.parentNode.replaceChild(message, oldMessage);

			// передает на сохранение
			inputYes.onclick = function () {
				savingDirectory(message, input.value);
			};

			// возвращает сообщение с вводом имени
			inputNo.onclick = function () {
				message.parentNode.replaceChild(oldMessage, message);
				input.value = "";
				input.focus();
			};
		},

	// Проверяет имя введенное пользователем для новой директории (create)
		inspectDirectory = function (message, input) {
			var regEx = /[\W]/,
				time = 500,
				dist = 3,
				start = (new Date()).getTime(),
				animateError = function () {
					var now = (new Date()).getTime(),
						elapsed = now - start,
						fraction = elapsed / time,
						x;
					if (fraction < 1) {
						x = dist * Math.sin(fraction * 4 * Math.PI);
						input.style.left = x + "px";
						window.setTimeout(animateError, Math.min(25, time - elapsed));
					} else {
						input.style.cssText = "";
						input.className = "";
						input.value = "";
						input.focus();
					}
				};

			// если имя не соответствует или "length" (зарезервированное слово)
			if (!input.value || regEx.test(input.value) || input.value === "length") {
				input.className = "active";
				animateError();
				// если имя соответствует, но уже существует
			} else if (localStorage[input.value]) {
				replaceDuplicateDirectory(message, input);
				// если имя соответствует
			} else {
				savingDirectory(message, input.value);
			}
		},

	// Открывает сообщение создания новой директории (create)
		createDirectory = function () {
			if (set.firstChild) {
				var message = document.createElement("div"),
					p = document.createElement("p"),
					inputText = document.createElement("input"),
					inputButton = document.createElement("input"),
					closeButton = document.createElement("span");

				message.id = "mCreate";

				p.innerHTML = "Введи имя для новой директории Smile Pack и нажми сохранить.<br>" +
					"(используй латиницу, цифры и андескор)";
				p.className = "mCreateP";

				inputText.type = "text";
				inputText.name = "saveSP";
				inputText.id = "mCreateInput";
				inputText.maxLength = "9";
				inputText.placeholder = "name...";

				inputButton.type = "button";
				inputButton.id = "mCreateButton";
				inputButton.value = "Сохранить";

				closeButton.id = "message-close";
				closeButton.title = "закрыть это окно";
				closeButton.innerHTML = "&#10008;";

				message.appendChild(p);
				message.appendChild(inputText);
				message.appendChild(inputButton);
				message.appendChild(closeButton);

				switchMessage(message);

				inputText.focus();

				// закрывает сообщение
				closeButton.onclick = switchMessage;

				// передает значение input на проверку
				inputButton.onclick = function () {
					inspectDirectory(message, inputText);
				};
			} else {
				giveTooltip(tooltip.create, this);
			}
		},


////////////////////////////////////////////////////DIRECTORIES/////////////////////////////////////////////////////////
	// Возвращает массив свойств localStorage (без cвойств для кеша и настроек) в алфавитном порядке (directories)
		lengthLocalStorage = function () {
			var regEx = /libraryLocalStorageCacheName_|settingsSmilePack_/,
				nameArray = [],
				i,
				len;

			for (i = 0, len = localStorage.length; i < len; i += 1) {
				if (!regEx.test(localStorage.key(i))) {
					nameArray.push(localStorage.key(i));
				}
			}

			nameArray.sort();

			if (nameArray.length) {
				directories.className = "active";
			} else {
				directories.className = "";
			}

			return nameArray;
		},

	// Загружает элементы, если есть созданные директории (directories)
		loadContentDirectories = function (directory, container) {
			if (directory.parentNode.tagName !== "LI" || directory.parentNode.className === "active") {
				return;
			}

			var content = JSON.parse(localStorage[directory.innerHTML]),
				liArr = document.getElementById("dirList").childNodes,
				frag = document.createDocumentFragment(),
				i,
				len,
				img;

			// создает коллекцию и помещает в frag
			for (i = 0, len = content.length; i < len; i += 1) {
				img = document.createElement("img");
				img.src = content[i];
				img.alt = content[i];
				img.className = "imgs2";
				frag.appendChild(img);
			}

			// удаляет значение className в li
			for (i = 0, len = liArr.length; i < len; i += 1) {
				if (liArr[i].className) {
					liArr[i].className = "";
				}
			}

			container.innerHTML = "";
			container.appendChild(frag);
			directory.parentNode.className = "active";
		},

	// Удаляет директории (directories)
		deleteFromDirectories = function (elem, p, cont) {
			var li = elem.parentNode,
				dirName = li.firstChild.innerHTML,
				arr,
				questDel = document.createElement("p"),
				questDelText = document.createElement("p"),
				questDelYes = document.createElement("span"),
				questDelNo = document.createElement("span");

			questDel.id = "questDel";
			questDelText.id = "questDelText";
			questDelText.innerHTML = "Удалить?";
			questDelYes.id = "questDelYes";
			questDelYes.innerHTML = "Да";
			questDelNo.id = "questDelNo";
			questDelNo.innerHTML = "Нет";
			questDel.appendChild(questDelText);
			questDel.appendChild(questDelYes);
			questDel.appendChild(questDelNo);

			li.replaceChild(questDel, elem);

			document.onclick = function (e) {
				e = fixEvent(e);

				if (!document.getElementById("questDel")) {
					return;
				}

				if (e.target === questDelYes) {
					localStorage.removeItem(dirName);
					li.parentNode.removeChild(li);
					arr = lengthLocalStorage();
					p.innerHTML = "Директории Smile Pack (<b>" + arr.length + "</b>)";
					if (arr.length === 0) {
						location.reload();
					} else {
						loadContentDirectories(document.getElementsByName("dir")[0], cont);
					}
				} else {
					questDel.parentNode.replaceChild(elem, questDel);
				}
			};
		},

	// Открывает сообщение о созданных директориях (directories)
		showDirectories = function () {
			var message = document.createElement("div"),
				p = document.createElement("p"),
				ol = document.createElement("ol"),
				cont = document.createElement("div"),
				closeButton = document.createElement("span"),
				arr = lengthLocalStorage(),
				li,
				a,
				b,
				del,
				i,
				len;

			// если в хранилиже есть свойства
			if (arr.length) {
				message.id = "mList";
				p.id = "headList";
				p.innerHTML = "Директории Smile Pack (<b>" + arr.length + "</b>)";
				ol.id = "dirList";
				cont.id = "contList";
				closeButton.id = "message-close";
				closeButton.title = "закрыть это окно";
				closeButton.innerHTML = "&#10008;";

				// создаст список из названий директорий, указывает в скобках кол-во элементов
				for (i = 0, len = arr.length; i < len; i += 1) {
					li = document.createElement("li");
					a = document.createElement("a");
					b = document.createElement("b");
					del = document.createElement("div");

					a.name = "dir";
					a.innerHTML = arr[i];
					b.innerHTML = " (" + JSON.parse(localStorage[arr[i]]).length + ")";
					del.className = "delDir";
					del.innerHTML = "&#10008;";

					li.appendChild(a);
					li.appendChild(b);
					li.appendChild(del);

					ol.appendChild(li);
				}

				message.appendChild(p);
				message.appendChild(ol);
				message.appendChild(cont);
				message.appendChild(closeButton);

				switchMessage(message);

				// закрывает сообщение
				closeButton.onclick = switchMessage;

				// загрузит содержимое первой директории
				loadContentDirectories(document.getElementsByName("dir")[0], cont);

				// обрабатывает нажатие клавиши мыши в зону ol
				ol.onmousedown = function (e) {
					e = fixEvent(e);

					if (e.which !== 1) {
						return;
					}

					var elem = e.target;

					// если нет questDel
					if (!document.getElementById("questDel")) {
						// вызывает функцию удаления директории
						if (elem.className === "delDir") {
							deleteFromDirectories(elem, p, cont);
							return;
						}

						// во всех других случаях:
						if (elem.tagName === "A" || elem.tagName === "B") {
							elem = elem.parentNode;
						}
						loadContentDirectories(elem.firstChild, cont);
					}
				};
			} else {
				giveTooltip(tooltip.directories, this);
			}
		},


////////////////////////////////////////////////////DONATE//////////////////////////////////////////////////////////////
	// Показывает сообщение "пожертвования" (donate)
		showDonate = function () {
			var message = document.createElement("div"),
				p1 = document.createElement("p"),
				div = document.createElement("div"),
				closeButton = document.createElement("span");

			message.id = "mDonate";
			p1.innerHTML = "Если тебе понравилось это приложение ты можешь поблагодарить создателя:";
			p1.className = "mDonateP1";

			div.innerHTML = '<iframe frameborder="0" allowtransparency="true" scrolling="no" ' +
				'src="https://money.yandex.ru/embed/shop.xml?uid=410011097622404&amp;' +
				'writer=seller&amp;targets=donate&amp;default-sum=&amp;button-text=04&amp;' +
				'hint=" width="450" height="162"></iframe>';

			closeButton.id = "message-close";
			closeButton.title = "закрыть это окно";
			closeButton.innerHTML = "&#10008;";

			message.appendChild(p1);
			message.appendChild(div);
			message.appendChild(closeButton);

			switchMessage(message);

			// закрывает сообщение
			closeButton.onclick = switchMessage;
		},


////////////////////////////////////////////////////LIBRARY/////////////////////////////////////////////////////////////
	// Загружает новую библиотеку. Кеширует библиотеки (lib)
		loadLib = function (elemWithKey) {
			// если идет загрузка выйти
			if (loadFlag === true) {
				return;
			}

			loadFlag = true;

			var key,
				storageKey,
				i,
				len,
				request,
				params,

			// достает из JSON, создает img, возвращает в виде фрагмента, отслеживает загрузку изображений с сервера
				fromJSONToFrag = function (json) {
					var arrCache = JSON.parse(json),
						wait = document.createElement("div"),
						smileFace = document.getElementById("smileFace"),
						frag = document.createDocumentFragment(),
						img,
						colorTimer;

					sml.innerHTML = "";
					sml.style.display = "none";
					wait.id = "smlWait";
					wait.innerHTML = "Загружаю.....";
					smileFace.className = "active";
					document.body.appendChild(wait);

					colorTimer = window.setInterval(function () {
						if (wait.className === "active") {
							wait.className = "";
						} else {
							wait.className = "active";
						}
					}, 500);

					// создает коллекцию и помещает в frag
					for (i = 0, len = arrCache.length; i < len; i += 1) {
						img = document.createElement("img");
						img.src = arrCache[i];
						img.alt = arrCache[i];
						img.className = "imgs";
						frag.appendChild(img);
					}

					// после загрузки удалить wait и сделать видимым sml
					img.onload = function () {
						sml.style.display = "";
						window.clearInterval(colorTimer);
						wait.parentNode.removeChild(wait);
						smileFace.className = "";
						loadFlag = false;
					};

					return frag;
				};

			// если функция запустилась без аргумента - дать ключу первое значение lib
			if (!elemWithKey) {
				key = lib;
				// иначе присвоить полученное значение от аргумента и запустить кеширование на содержимое sml
			} else {
				key = elemWithKey.innerHTML;

				// сохранение изменной старой библиотеки в sessionCache и замена значение lib на новое
				(function () {
					var smlList = sml.childNodes,
						editSmlList = [];

					if (smlList.length === 0) {
						sessionCache[lib] = "";
					} else {
						for (i = 0, len = smlList.length; i < len; i += 1) {
							editSmlList[i] = smlList[i].src.match(regExIMG);
						}

						sessionCache[lib] = JSON.stringify(editSmlList);
					}

					// присвоить внешней переменной lib значение запрашиваемой библиотеки
					lib = key;
				}());
			}

			storageKey = "libraryLocalStorageCacheName_" + key;

			// проверка запрашиваемой библиотеки в sessionCache. В кеше может быть пустая строка!
			if (sessionCache[key] !== undefined && elemWithKey) {
				if (sessionCache[key] === "") {
					sml.innerHTML = "";
					loadFlag = false;
				} else {
					sml.appendChild(fromJSONToFrag(sessionCache[key]));
				}

				// иначе проверка запрашиваемой библиотеки в storageCache. Если есть внести ее в sml
			} else if (localStorage[storageKey]) {
				sml.appendChild(fromJSONToFrag(localStorage[storageKey]));

				// если везде пусто, то загрузка ajax
			} else {
				request = new window.XMLHttpRequest();
				params = "name=" + encodeURIComponent(key);
				request.open("GET", "check.php?" + params, true);
				request.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");

				request.onreadystatechange = function () {
					if (request.readyState === 4 && request.status === 200) {
						// кешировать в storage полученные данные
						localStorage[storageKey] = request.responseText;

						// преобразовать JSON и положить в sml
						sml.appendChild(fromJSONToFrag(request.responseText));
					}
				};

				request.send(null);
			}

			// обновляет значение className в li
			for (i = 0, len = libsArr.length; i < len; i += 1) {
				if (libsArr[i].innerHTML === key) {
					libsArr[i].className = "active";
				} else {
					libsArr[i].className = "";
				}
			}
		},

	// Получает элемент содержащий ключ (lib)
		getKey = function (e) {
			e = fixEvent(e);

			if (e.which !== 1 || e.target.tagName !== "LI" || e.target.className === "active") {
				return;
			}

			var elem = e.target;

			loadLib(elem);
		},


////////////////////////////////////////////////////ShowLibs////////////////////////////////////////////////////////////
	// Закрывает библиотеки (libs)
		closeLibs = function () {
			switchMessage();
			document.body.className = "";
			document.getElementById("header").className = "";
			bookmarklet.className = "";
			set.className = "";
			document.getElementById("setText").className = "";
			sml.className = "";
			libs.className = "";
			libsBorder.className = "";
		},

	// Открывает библиотеки (libs)
		openLibs = function () {
			libsBorder.className = "openLibs";
			libs.className = "openLibs";
			document.body.className = "openLibs";
			document.getElementById("header").className = "openLibs";
			bookmarklet.className = "openLibs";
			set.className = "openLibs";
			document.getElementById("setText").className = "openLibs";
			sml.className = "openLibs";
		},

	// Открывает фон для библиотек (libs)
		giveBackForLibs = function () {
			switchMessage();
			document.getElementById("back").className = "libs";

			document.getElementById("back").onmouseover = function () {
				closeLibs();
			};
		},

	// Открывает библиотеки при наведении на libsBorder (libs)
		showLibs = function () {
			giveBackForLibs();
			openLibs();
		},

	// Фиксирует библиотеки (libs)
		freezeLibs = function () {
			// отключает опцию
			if (libsFreeze.className === "active") {
				libsFreeze.className = "";
				giveBackForLibs();
				localStorage.settingsSmilePack_freezeLibs = "false";
				// включает опцию
			} else {
				libsFreeze.className = "active";
				switchMessage();
				localStorage.settingsSmilePack_freezeLibs = "true";
			}
		},


////////////////////////////////////////////////////Help////////////////////////////////////////////////////////////////
	// Открывает инструкцию в контейнере (help)
		showInstructionsForHelp = function (container) {
			var frag = document.createDocumentFragment(),
				rCont = document.createElement("div"),
				r1 = document.createElement("span"),
				r2 = document.createElement("span"),
				r3 = document.createElement("span"),
				ol = document.createElement("ol"),
				li1 = document.createElement("li"),
				li2 = document.createElement("li"),
				li3 = document.createElement("li"),
				t1 = document.createElement("p"),
				t2 = document.createElement("p"),
				t3 = document.createElement("p"),
				img1 = document.createElement("img"),
				img2 = document.createElement("img"),
				img3 = document.createElement("img");

			rCont.id = "radioContHelp";

			r1.innerHTML = "Шаг 1";
			r2.innerHTML = "Шаг 2";
			r3.innerHTML = "Шаг 3";

			rCont.appendChild(r1);
			rCont.appendChild(r2);
			rCont.appendChild(r3);

			t1.innerHTML = img1.alt = "1. Перетащи красный значок Smile Pack в закладки.";
			t2.innerHTML = img2.alt = "2. Создай директории из любимых смайликов используя библиотеки.";
			t3.innerHTML = img3.alt = "3. Открывай Smile Pack на форумах и сайтах и размещай смайлики в два клика!";

			img1.src = "img/1.png";
			img2.src = "img/2.png";
			img3.src = "img/3.png";

			img1.style.cssText = "width: 700px; height: 298px;";
			img2.style.cssText = "width: 700px; height: 324px;";
			img3.style.cssText = "width: 700px; height: 442px;";

			li1.appendChild(t1);
			li2.appendChild(t2);
			li3.appendChild(t3);

			// первоначальные настройки
			r1.className = li1.className = "active";

			li1.appendChild(img1);
			li2.appendChild(img2);
			li3.appendChild(img3);

			ol.appendChild(li1);
			ol.appendChild(li2);
			ol.appendChild(li3);

			frag.appendChild(rCont);
			frag.appendChild(ol);

			container.appendChild(frag);

			rCont.onmousedown = function (e) {
				e = fixEvent(e);

				if (e.which !== 1 || e.target.tagName !== "SPAN" || e.target.className === "active") {
					return;
				}

				switch (e.target) {
				case r1:
					r1.className = li1.className = "active";
					r2.className = li2.className = "";
					r3.className = li3.className = "";
					break;
				case r2:
					r1.className = li1.className = "";
					r2.className = li2.className = "active";
					r3.className = li3.className = "";
					break;
				case r3:
					r1.className = li1.className = "";
					r2.className = li2.className = "";
					r3.className = li3.className = "active";
					break;
				}
			};
		},

	// Открывает видео в контейнере (help)
		showVideoForHelp = function (container) {
			container.innerHTML = '<iframe width="815" ' +
				'height="458" ' +
				'src="http://www.youtube.com/embed/yKRrWsKcD7s?rel=0" ' +
				'frameborder="0" allowfullscreen></iframe>';
		},

	// Открывает помощь (help)
		showHelp = function () {
			var message = document.createElement("div"),
				article = document.createElement("article"),
				h1 = document.createElement("h1"),
				p = document.createElement("p"),
				menu = document.createElement("div"),
				m1 = document.createElement("p"),
				m2 = document.createElement("p"),
				cont = document.createElement("div"),
				closeButton = document.createElement("p");

			message.id = "mHelp";
			h1.innerHTML = "Smile Pack - любимые смайлики всегда под рукой!";
			p.id = "preHelp";
			p.innerHTML = "Приложение для удобной передачи смайликов на форумы и сайты.";

			menu.id = "menuHelp";
			m1.id = "menu1";
			m1.innerHTML = "Инструкция";
			m2.id = "menu2";
			m2.innerHTML = "Видео";

			cont.id = "contHelp";

			closeButton.id = "message-close";
			closeButton.innerHTML = "&#10008;";

			article.appendChild(h1);
			article.appendChild(p);

			menu.appendChild(m1);
			menu.appendChild(m2);

			message.appendChild(article);
			message.appendChild(menu);
			message.appendChild(cont);
			message.appendChild(closeButton);

			// По умолчанию первая вкладка открыта
			m1.className = "active";
			showInstructionsForHelp(cont);

			switchMessage(message);
			document.getElementById("back").className = "help";

			menu.onmousedown = function (e) {
				e = fixEvent(e);

				if (e.which !== 1 || e.target.className === "active") {
					return;
				}

				if (e.target.id === "menu1") {
					m2.className = "";
					m1.className = "active";
					cont.innerHTML = "";
					showInstructionsForHelp(cont);
				} else {
					m1.className = "";
					m2.className = "active";
					cont.innerHTML = "";
					showVideoForHelp(cont);
				}
			};

			closeButton.onmousedown = switchMessage;
		},


////////////////////////////////////////////////OtherVersion////////////////////////////////////////////////////////////
	// Прописывает в элемент otherVersion другую версию
		giveContentForOtherVersion = function () {
			if (localStorage.settingsSmilePack_style === "lite") {
				otherVersion.innerHTML = "<span>full</span> - версия для мощных ЭВМ";
			} else {
				otherVersion.innerHTML = "<span>lite</span> - версия для слабых ЭВМ";
			}
		},

	// Меняет версию приложения
		giveOtherVersion = function (e) {
			e = fixEvent(e);

			if (e.which !== 1 || e.target.tagName !== "SPAN") {
				return;
			}

			var value = e.target.innerHTML,
				style = document.getElementById("style");

			if (value === "lite") {
				style.href = "style_lite.css";
			} else {
				style.href = "style.css";
			}

			localStorage.settingsSmilePack_style = value;
			giveContentForOtherVersion();
		};


////////////////////////////////////////////////////События/////////////////////////////////////////////////////////////
	// Drag - n - Drop
	addEvent(document, "mousedown", dragDown);
	addEvent(document, "mousemove", dragMove);
	addEvent(document, "mouseup", dragUp);

	// Кнопки основного функционала
	addEvent(create, "mousedown", createDirectory);
	addEvent(directories, "mousedown", showDirectories);
	addEvent(help, "mousedown", showHelp);
	addEvent(donate, "mousedown", showDonate);
	addEvent(libs, "mousedown", getKey);
	addEvent(libsBorder, "mouseover", showLibs);
	addEvent(libsFreeze, "click", freezeLibs);
	addEvent(otherVersion, "mousedown", giveOtherVersion);

	document.onmousedown = document.body.onselectstart = smilePack.onclick = function () {
		return false;
	};

	// Подсказка для букмарклета
	smilePack.onmousedown = function (e) {
		giveTooltip(tooltip.smilePack, this);

		e = fixEvent(e);
		if (e.stopPropagation) {
			e.stopPropagation();
		} else {
			e.cancelBubble = true;
		}
	};

	// Help для нового пользователя, библиотеки выдвинуты
	if (!localStorage.length) {
		showHelp();
		localStorage.settingsSmilePack_freezeLibs = "true";
	}

	// Выдвигает библиотеки при загрузке при включенном libsFreeze
	if (localStorage.settingsSmilePack_freezeLibs === "true") {
		openLibs();
		libsFreeze.className = "active";
	}

	// Выполнить при загрузке
	loadLib();
	lengthLocalStorage();
	giveContentForOtherVersion();
}(this));