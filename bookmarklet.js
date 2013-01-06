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
		localStorage = window.localStorage,

		dirs = document.getElementById("dirList"), //////////////// список сохраненных директорий
		smls = document.getElementById("smiles"), ///////////////// контейнер для смайликов
		win = window.top,
		i,
		len,

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

	// Возвращает массив свойств localStorage (без cвойств для кеша и настроек) в алфавитном порядке
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

			return nameArray;
		},

	// Загружает смайлики в smls
		loadContent = function (directory) {
			if (directory.parentNode.tagName !== "LI" || directory.parentNode.className === "active") {
				return;
			}

			var content = JSON.parse(localStorage[directory.innerHTML]),
				liArr = dirs.childNodes,
				frag = document.createDocumentFragment(),
				img;

			// создает коллекцию и помещает в frag
			for (i = 0, len = content.length; i < len; i += 1) {
				img = document.createElement("img");
				img.src = content[i];
				img.alt = content[i];
				img.className = "imgs";
				frag.appendChild(img);
			}

			// удаляет значение className в li
			for (i = 0, len = liArr.length; i < len; i += 1) {
				if (liArr[i].className) {
					liArr[i].className = "";
				}
			}

			smls.innerHTML = "";
			smls.appendChild(frag);
			directory.parentNode.className = "active";
		},

	// Формирует разметку букмарклета, назначает событие на область dirs
		formBookmarklet = function () {
			var arr = lengthLocalStorage(),
				frag = document.createDocumentFragment(),
				li,
				a,
				b;

			if (arr.length) {
				for (i = 0, len = arr.length; i < len; i += 1) {
					li = document.createElement("li");
					a = document.createElement("a");
					b = document.createElement("b");

					a.name = "dir";
					a.innerHTML = arr[i];
					b.innerHTML = " (" + JSON.parse(localStorage[arr[i]]).length + ")";

					li.appendChild(a);
					li.appendChild(b);

					frag.appendChild(li);
				}

				dirs.appendChild(frag);
				loadContent(dirs.firstChild.firstChild);
			} else {
				document.body.style.textAlign = "center";
				document.body.innerHTML = 'Ты еще не создал Smile Pack. Посети ' +
					'<a onclick="return !window.open(this.href)" href="http://sp.hnoe.ru/">сайт</a>.';
			}
		},

	// Изменяет активную директорию при клике в зоне dirs
		changeDirectory = function (e) {
			e = fixEvent(e);

			if (e.which !== 1) {
				return;
			}

			var elem = e.target;

			if (elem.tagName === "A" || elem.tagName === "B") {
				elem = elem.parentNode;
			}

			loadContent(elem.firstChild);
		},

	// Деактивирует активный смайл
		deactivateElement = function () {
			var arr = smls.childNodes;

			for (i = 0, len = arr.length; i < len; i += 1) {
				if (arr[i].className === "active") {
					arr[i].className = "imgs";
				}
			}
		},

	// Активирует смайл для передачи
		activateElement = function (e) {
			e = fixEvent(e);

			if (e.which !== 1) {
				return;
			}

			var elem = e.target;

			if (elem.className === "imgs") {
				deactivateElement();
				elem.className = "active";
				win.postMessage(elem.alt, "*");
			} else {
				deactivateElement();
				win.postMessage("", "*");
			}
		};


	addEvent(dirs, "mousedown", changeDirectory);
	addEvent(window, "load", formBookmarklet);
	addEvent(window, "click", activateElement);
	addEvent(window, "message", deactivateElement);
}(this));