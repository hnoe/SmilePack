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
		data,
		source,

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
				e.which = e.button & 1 ? 1 : ( e.button & 2 ? 3 : ( e.button & 4 ? 2 : 0 ) )
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

	// Получает сообщение от стороннего окна.
		listener = function (e) {
			e = fixEvent(e);

			data = e.data;     // ключ
			source = e.source; // ссылка на окно
		},

	// Вызывется из getPosition. Генерирует новое сообщение с вложенным ключом. Удаляет значение ключа,
	// отправляет сообщение окну, хозяину ключа.
		insertSML = function (element, before, after) {
			var sml = '[URL=http://sp.hnoe.ru/][IMG]http://sp.hnoe.ru/' + data + '[/IMG][/URL]';
			element.value = before + sml + after;

			data = "";
			source.postMessage("", "*");
		},

	// Срабатывает событие на клик, проверяет текущий элемент под курсором.
	// Если элемент textarea или text.type == "text" узнает место вхождения курсора,
	// определяет текст перед курсором (start) и текст после курсора (end).
	// Проверяет есть ли наличие в data ключа, полученного из стороннего окна. Если есть вызывает функцию insertSML.
		getPosition = function (e) {
			e = fixEvent(e);

			var elem, start, end;

			elem = document.elementFromPoint(e.clientX, e.clientY);
			if (elem.tagName === "TEXTAREA" || elem.type === "text") {

				start = elem.value.slice(0, elem.selectionStart);
				end = elem.value.slice(elem.selectionStart, elem.value.length);

				if (data) {
					insertSML(elem, start, end);
				}
			} else {
				data = "";
				source.postMessage("", "*");
			}
		};


	addEvent(window, "message", listener);
	addEvent(window, "click", getPosition);
}(this));
