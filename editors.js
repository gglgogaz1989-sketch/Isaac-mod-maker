
"use strict";

(function () {
	const project = {
		name: "Мой мод",
		items: [],
		characters: [],
		enemies: []
	};

	let nextId = 1;
	let currentPage = "items";
	let editing = null;

	const definitions = {
		item: {
			title: "Предмет",
			collection: "items",
			fields: [
				{ name: "name", label: "Название", type: "text", value: "Новый предмет" },
				{ name: "id", label: "ID предмета", type: "number", value: 100 },
				{ name: "quality", label: "Качество (0–4)", type: "number", value: 1 },
				{ name: "description", label: "Описание", type: "text", value: "Описание предмета" },
				{ name: "passive", label: "Тип", type: "select", options: ["Пассивный", "Активный", "Карточка", "Пилюля", "Руна"], value: "Пассивный" }
			]
		},
		character: {
			title: "Персонаж",
			collection: "characters",
			fields: [
				{ name: "name", label: "Имя", type: "text", value: "Новый персонаж" },
				{ name: "health", label: "Здоровье", type: "number", value: 3 },
				{ name: "damage", label: "Урон", type: "number", value: 3.5 },
				{ name: "speed", label: "Скорость", type: "number", value: 1 },
				{ name: "tears", label: "Скорострельность", type: "number", value: 2.73 },
				{ name: "description", label: "Описание", type: "text", value: "Новый герой" }
			]
		},
		enemy: {
			title: "Враг",
			collection: "enemies",
			fields: [
				{ name: "name", label: "Название", type: "text", value: "Новый враг" },
				{ name: "health", label: "Здоровье", type: "number", value: 10 },
				{ name: "damage", label: "Урон", type: "number", value: 1 },
				{ name: "speed", label: "Скорость", type: "number", value: 1 },
				{ name: "behavior", label: "Поведение", type: "select", options: ["Обычный", "Преследует игрока", "Стреляет", "Взрывается", "Босс"], value: "Обычный" },
				{ name: "description", label: "Описание", type: "text", value: "Новый противник" }
			]
		}
	};

	const pageCollections = {
		items: "items",
		characters: "characters",
		enemies: "enemies"
	};

	function escapeHTML(value) {
		return String(value ?? "").replace(/[&<>"']/g, function (char) {
			return {
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;"
			}[char];
		});
	}

	function getCollection(type) {
		const definition = definitions[type];
		return definition ? project[definition.collection] : [];
	}

	function notify(message) {
		if (window.IsaacApp && typeof window.IsaacApp.showToast === "function") {
			window.IsaacApp.showToast(message);
		}
	}

	function getMainContent() {
		return document.getElementById("pageContent");
	}

	function getGeneratedPage() {
		let page = document.getElementById("editorGeneratedPage");

		if (!page) {
			page = document.createElement("section");
			page.id = "editorGeneratedPage";
			page.className = "generated-page";
			page.hidden = true;

			const dashboard = getMainContent();

			if (dashboard && dashboard.parentElement) {
				dashboard.parentElement.appendChild(page);
			}
		}

		return page;
	}

	function showGeneratedPage() {
		const dashboard = getMainContent();
		const page = getGeneratedPage();

		if (dashboard) dashboard.hidden = true;
		page.hidden = false;

		return page;
	}

	function updateCounts() {
		const itemCount = document.getElementById("itemCount");
		const characterCount = document.getElementById("characterCount");
		const enemyCount = document.getElementById("enemyCount");

		if (itemCount) itemCount.textContent = project.items.length;
		if (characterCount) characterCount.textContent = project.characters.length;
		if (enemyCount) enemyCount.textContent = project.enemies.length;

		const roomCount = document.getElementById("roomCount");

		if (roomCount && window.IsaacRooms &&
			typeof window.IsaacRooms.getCount === "function") {
			roomCount.textContent = window.IsaacRooms.getCount();
		}
	}

	function makeField(field, value) {
		const fieldValue = value ?? field.value ?? "";

		if (field.type === "select") {
			const options = field.options.map(function (option) {
				return `<option value="${escapeHTML(option)}" ${String(fieldValue) === option ? "selected" : ""}>${escapeHTML(option)}</option>`;
			}).join("");

			return `
				<label class="editor-field">
					<span>${escapeHTML(field.label)}</span>
					<select name="${escapeHTML(field.name)}">${options}</select>
				</label>`;
		}

		return `
			<label class="editor-field">
				<span>${escapeHTML(field.label)}</span>
				<input
					name="${escapeHTML(field.name)}"
					type="${field.type === "number" ? "number" : "text"}"
					${field.type === "number" ? 'step="any"' : ""}
					value="${escapeHTML(fieldValue)}"
					required
				>
			</label>`;
	}

	function getObjectName(object) {
		return object.name || "Без названия";
	}

	function renderObjectList(type, filter) {
		const collection = getCollection(type);
		const query = String(filter || "").trim().toLowerCase();

		const filtered = collection.filter(function (object) {
			return getObjectName(object).toLowerCase().includes(query);
		});

		if (filtered.length === 0) {
			return `<div class="panel"><p>${query ? "Ничего не найдено." : "Здесь пока пусто. Создай первый объект!"}</p></div>`;
		}

		return `
			<div class="object-list">
				${filtered.map(function (object) {
					return `
						<div class="object-item">
							<div>
								<strong>${escapeHTML(getObjectName(object))}</strong>
								<p class="object-description">${escapeHTML(object.description || definitions[type].title)}</p>
								<small>ID проекта: ${escapeHTML(object.uid)}</small>
							</div>
							<div class="object-actions">
								<button type="button" class="secondary-button" data-edit="${escapeHTML(object.uid)}" data-type="${type}">Изменить</button>
								<button type="button" class="danger-button" data-delete="${escapeHTML(object.uid)}" data-type="${type}">Удалить</button>
							</div>
						</div>`;
				}).join("")}
			</div>`;
	}

	function renderEditorForm(type, object) {
		const definition = definitions[type];
		const isEditing = Boolean(object);

		const fields = definition.fields.map(function (field) {
			return makeField(field, object ? object[field.name] : field.value);
		}).join("");

		return `
			<section class="panel">
				<h2>${isEditing ? "Редактирование" : "Создание"}: ${escapeHTML(definition.title.toLowerCase())}</h2>
				<form id="objectEditorForm" data-type="${type}" data-uid="${object ? escapeHTML(object.uid) : ""}">
					<div class="editor-fields">${fields}</div>
					<div class="quick-actions">
						<button type="submit">${isEditing ? "Сохранить изменения" : "Создать"}</button>
						<button type="button" class="secondary-button" id="cancelObjectEdit">Отмена</button>
					</div>
				</form>
			</section>`;
	}

	function renderCollectionPage(type, searchText) {
		const definition = definitions[type];
		const page = showGeneratedPage();

		page.innerHTML = `
			<div class="page-heading">
				<div>
					<h1>${definition.title === "Предмет" ? "Предметы" : definition.title === "Персонаж" ? "Персонажи" : "Враги"}</h1>
					<p>Создавай и настраивай объекты своего мода.</p>
				</div>
				<button type="button" id="createObject">+ Создать</button>
			</div>

			<div class="panel">
				<label class="editor-field">
					<span>Поиск</span>
					<input id="objectSearch" type="search" placeholder="Введи название..." value="${escapeHTML(searchText || "")}">
				</label>
				<p>Всего объектов: <strong>${getCollection(type).length}</strong></p>
			</div>

			<div id="objectFormArea"></div>
			<div id="objectListArea">${renderObjectList(type, searchText)}</div>
		`;

		const createButton = page.querySelector("#createObject");
		createButton.addEventListener("click", function () {
			editing = { type: type, uid: null };
			renderCollectionPage(type, page.querySelector("#objectSearch")?.value || "");
			const formArea = getGeneratedPage().querySelector("#objectFormArea");
			formArea.innerHTML = renderEditorForm(type, null);
			bindEditorForm();
		});

		const search = page.querySelector("#objectSearch");
		search.addEventListener("input", function () {
			const listArea = page.querySelector("#objectListArea");
			listArea.innerHTML = renderObjectList(type, search.value);
		});

		page.addEventListener("click", function (event) {
			const editButton = event.target.closest("[data-edit]");
			const deleteButton = event.target.closest("[data-delete]");

			if (editButton && editButton.dataset.type === type) {
				const object = getCollection(type).find(item => String(item.uid) === editButton.dataset.edit);
				if (!object) return;

				editing = { type: type, uid: object.uid };
				page.querySelector("#objectFormArea").innerHTML = renderEditorForm(type, object);
				bindEditorForm();
			}

			if (deleteButton && deleteButton.dataset.type === type) {
				const uid = deleteButton.dataset.delete;
				const index = getCollection(type).findIndex(item => String(item.uid) === uid);

				if (index === -1) return;

				const object = getCollection(type)[index];
				const accepted = window.confirm(`Удалить «${getObjectName(object)}»?`);

				if (!accepted) return;

				getCollection(type).splice(index, 1);
				editing = null;
				renderCollectionPage(type, search.value);
				updateCounts();
				notify("Объект удалён");
			}
		});

		updateCounts();
	}

	function bindEditorForm() {
		const page = getGeneratedPage();
		const form = page.querySelector("#objectEditorForm");
		if (!form) return;

		const cancelButton = page.querySelector("#cancelObjectEdit");

		if (cancelButton) {
			cancelButton.addEventListener("click", function () {
				editing = null;
				renderCollectionPage(form.dataset.type, page.querySelector("#objectSearch")?.value || "");
			});
		}

		form.addEventListener("submit", function (event) {
			event.preventDefault();

			const type = form.dataset.type;
			const definition = definitions[type];
			if (!definition) return;

			const data = {};
			for (const field of definition.fields) {
				const input = form.elements.namedItem(field.name);
				if (!input) continue;

				if (field.type === "number") {
					const number = Number(input.value);

					if (!Number.isFinite(number)) {
						input.focus();
						notify("Проверь числовое значение");
						return;
					}

					data[field.name] = number;
				} else {
					data[field.name] = input.value.trim();
				}
			}

			if (!data.name) {
				notify("Введи название");
				return;
			}

			const uid = form.dataset.uid;
			const collection = getCollection(type);

			if (uid) {
				const object = collection.find(item => String(item.uid) === uid);
				if (!object) {
					notify("Объект не найден");
					return;
				}
				Object.assign(object, data);
				notify("Изменения сохранены");
			} else {
				collection.push({
					uid: String(nextId++),
					...data
				});
				notify("Объект создан!");
			}

			editing = null;
			renderCollectionPage(type);
			updateCounts();
		});
	}

	function openSimplePage(pageName, heading, description, body) {
		const page = showGeneratedPage();
		page.innerHTML = `
			<div class="page-heading">
				<div>
					<h1>${escapeHTML(heading)}</h1>
					<p>${escapeHTML(description)}</p>
				</div>
			</div>
			<section class="panel">${body}</section>
		`;
	}

	function openPage(page) {
		currentPage = page;

		if (pageCollections[page]) {
			const type = page === "items" ? "item" :
				page === "characters" ? "character" : "enemy";

			renderCollectionPage(type);
			return;
		}

		if (page === "rooms" && window.IsaacRooms &&
			typeof window.IsaacRooms.openPage === "function") {
			window.IsaacRooms.openPage();
			return;
		}

		switch (page) {
			case "rooms":
				openSimplePage(page, "Комнаты", "Редактор комнат подключится в части 5.", "<p>Следующая часть добавит сетку комнаты и размещение объектов.</p>");
				break;

			case "textures":
				openSimplePage(page, "Текстуры", "Управление изображениями мода.", `
					<label class="editor-field">
						<span>Выбери изображение</span>
						<input id="textureUpload" type="file" accept="image/png,image/jpeg,image/webp">
					</label>
					<div id="texturePreview"></div>
					<p>Загруженные изображения пока доступны только в этом открытом окне.</p>
				`);
				bindTextureUpload();
				break;

			case "lua":
				openSimplePage(page, "Lua-редактор", "Черновик кода для логики мода.", `
					<label class="editor-field">
						<span>Файл Lua</span>
						<input id="luaFilename" value="main.lua">
					</label>
					<label class="editor-field">
						<span>Код</span>
						<textarea id="luaCode" rows="14" spellcheck="false">-- Isaac Mod Maker
-- Черновик Lua-кода

local mod = RegisterMod("My Mod", 1)

-- Добавляй код своего мода ниже
</textarea>
					</label>
					<button type="button" id="downloadLua">Скачать .lua</button>
				`);
				bindLuaEditor();
				break;

			case "assistant":
				openSimplePage(page, "ИИ-помощник", "Локальные подсказки по созданию мода.", `
					<p>Напиши, что хочешь добавить в мод, и получи шаблон для начала работы.</p>
					<label class="editor-field">
						<span>Идея</span>
						<textarea id="assistantIdea" rows="4" placeholder="Например: предмет, который увеличивает урон"></textarea>
					</label>
					<button type="button" id="generateIdea">Создать шаблон</button>
					<pre id="assistantResult" class="code-editor"></pre>
					<p><small>Это локальный генератор шаблонов, а не подключённая онлайн-ИИ-модель.</small></p>
				`);
				bindAssistant();
				break;

			case "build":
				openSimplePage(page, "Сборка мода", "Подготовка файлов проекта.", `
					<p>Здесь можно будет проверить данные и экспортировать проект.</p>
					<button type="button" id="exportProjectJson">Экспортировать данные проекта (JSON)</button>
					<p><small>Экспорт JSON сохраняет данные редактора, но сам по себе не создаёт готовый игровой мод.</small></p>
				`);
				bindProjectExport();
				break;

			case "settings":
				openSimplePage(page, "Настройки", "Настройки проекта.", `
					<label class="editor-field">
						<span>Название мода</span>
						<input id="projectNameInput" value="${escapeHTML(project.name)}">
					</label>
					<button type="button" id="saveProjectName">Сохранить название</button>
				`);
				bindSettings();
				break;

			default:
				openSimplePage(page, "Раздел", "Выбери раздел в меню.", "<p>Раздел пока не реализован.</p>");
		}
	}

	function bindTextureUpload() {
		const input = document.getElementById("textureUpload");
		const preview = document.getElementById("texturePreview");
		if (!input || !preview) return;

		input.addEventListener("change", function () {
			const file = input.files && input.files[0];
			if (!file) return;

			if (!file.type.startsWith("image/")) {
				notify("Выбери файл изображения");
				return;
			}

			const reader = new FileReader();
			reader.onload = function () {
				preview.innerHTML = `
					<p>${escapeHTML(file.name)}</p>
					<img src="${reader.result}" alt="Предпросмотр текстуры" style="max-width:100%;max-height:240px">
				`;
			};
			reader.readAsDataURL(file);
		});
	}

	function bindLuaEditor() {
		const button = document.getElementById("downloadLua");
		if (!button) return;

		button.addEventListener("click", function () {
			const nameInput = document.getElementById("luaFilename");
			const codeInput = document.getElementById("luaCode");
			const filename = (nameInput.value.trim() || "main.lua").replace(/[\\/:*?"<>|]/g, "_");
			const blob = new Blob([codeInput.value], { type: "text/plain;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");

			link.href = url;
			link.download = filename.endsWith(".lua") ? filename : filename + ".lua";
			link.click();

			URL.revokeObjectURL(url);
			notify("Файл Lua подготовлен");
		});
	}

	function bindAssistant() {
		const button = document.getElementById("generateIdea");
		if (!button) return;

		button.addEventListener("click", function () {
			const idea = document.getElementById("assistantIdea").value.trim();
			const result = document.getElementById("assistantResult");

			if (!idea) {
				notify("Сначала опиши свою идею");
				return;
			}

			result.textContent =
				"-- Идея: " + idea + "\n\n" +
				"-- Шаблон Lua для начала работы\n" +
				"local mod = RegisterMod(\"My Mod\", 1)\n\n" +
				"function mod:OnGameStart(isContinued)\n" +
				"    -- Добавь логику своей идеи здесь\n" +
				"end\n\n" +
				"mod:AddCallback(ModCallbacks.MC_POST_GAME_STARTED, mod.OnGameStart)\n\n" +
				"-- Это заготовка: реализуй механику и проверь API своей версии игры.";
		});
	}

	function downloadJSON(filename, data) {
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json;charset=utf-8"
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");

		link.href = url;
		link.download = filename;
		link.click();

		URL.revokeObjectURL(url);
	}

	function bindProjectExport() {
		const button = document.getElementById("exportProjectJson");
		if (!button) return;

		button.addEventListener("click", function () {
			downloadJSON("isaac-mod-project.json", project);
			notify("Экспорт проекта подготовлен");
		});
	}

	function bindSettings() {
		const button = document.getElementById("saveProjectName");
		if (!button) return;

		button.addEventListener("click", function () {
			const input = document.getElementById("projectNameInput");
			const name = input.value.trim();

			if (!name) {
				notify("Введи название проекта");
				return;
			}

			project.name = name;

			if (window.IsaacApp &&
				typeof window.IsaacApp.updateProjectName === "function") {
				window.IsaacApp.updateProjectName(name);
			}

			notify("Название проекта обновлено");
		});
	}

	function create(type) {
		if (!definitions[type]) {
			notify("Неизвестный тип объекта");
			return;
		}

		const page = definitions[type].collection;
		openPage(page);

		editing = { type: type, uid: null };

		const formArea = getGeneratedPage().querySelector("#objectFormArea");
		if (formArea) {
			formArea.innerHTML = renderEditorForm(type, null);
			bindEditorForm();
		}
	}

	function setProject(data) {
		if (!data || typeof data !== "object") {
			throw new Error("Некорректные данные проекта");
		}

		for (const key of ["items", "characters", "enemies"]) {
			if (Array.isArray(data[key])) {
				project[key] = data[key].map(function (item) {
					return {
						...item,
						uid: String(item.uid || nextId++)
					};
				});
			}
		}

		if (typeof data.name === "string") {
			project.name = data.name;
		}

		const ids = [
			...project.items,
			...project.characters,
			...project.enemies
		].map(item => Number(item.uid)).filter(Number.isFinite);

		nextId = Math.max(nextId, 1, ...ids.map(id => id + 1));
		updateCounts();

		if (currentPage && pageCollections[currentPage]) {
			openPage(currentPage);
		}
	}

	window.IsaacEditors = {
		openPage: openPage,
		create: create,
		getProject: function () {
			return project;
		},
		setProject: setProject,
		updateCounts: updateCounts
	};
})();
    
