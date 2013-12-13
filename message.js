// ========================================================================
// Smile Pack v1.1
// http://sp.lgick.ru
// ========================================================================
// Copyright 2012 lgick
// Email: lgick@yandex.ru
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

	// Возвращает позицию курсора
		getCaretPos = function (el) {
			var selStart, r, re, rc, add_newlines, i;
			if (el.selectionStart) {
				selStart = el.selectionStart;
			} else if (document.selection) {
				el.focus();

				r = document.selection.createRange();
				if (r === null) {
					return 0;
				}

				re = el.createTextRange();
				rc = re.duplicate();
				re.moveToBookmark(r.getBookmark());
				rc.setEndPoint('EndToStart', re);

				add_newlines = 0;
				for (i = 0; i < rc.text.length; i += 1) {
					if (rc.text.substr(i, 2) === '\r\n') {
						add_newlines += 2;
						i += 1;
					}
				}

				selStart = rc.text.length - add_newlines;
			} else {
				selStart = 0;
			}
			return selStart;
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
			var sml = '[URL=http://sp.lgick.ru/][IMG]http://sp.lgick.ru/' + data + '[/IMG][/URL]';
			element.value = before + sml + after;

			data = "";
			source.postMessage("", "*");
		},

	// Срабатывает событие на клик, проверяет текущий элемент под курсором.
	// Если элемент textarea или text.type == "text" узнает место вхождения курсора,
	// определяет текст перед курсором (start) и текст после курсора (end).
	// Проверяет есть ли наличие в data ключа, полученного из стороннего окна. Если есть вызывает функцию insertSML.
		getPosition = function (e) {
			if (!data) {
				return;
			}

			e = fixEvent(e);

			var elem, start, end, pos;

			elem = document.elementFromPoint(e.clientX, e.clientY);
			pos = getCaretPos(elem);
			if (elem.tagName === "TEXTAREA" || elem.type === "text") {

				start = elem.value.slice(0, pos);
				end = elem.value.slice(pos, elem.value.length);

				insertSML(elem, start, end);
			} else {
				data = "";
				source.postMessage("", "*");
			}
		};


	addEvent(window, "message", listener);
	addEvent(document, "click", getPosition);
}(this));