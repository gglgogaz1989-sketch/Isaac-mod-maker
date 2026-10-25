
"use strict";

(function () {
	const TILE_TYPES = {
		floor: { label: "Пол", icon: "▫️" },
		wall: { label: "Стена", icon: "🧱" },
		rock: { label: "Камень", icon: "🪨" },
		pit: { label: "Яма", icon: "⬛" },
		spike: { label: "Шипы", icon: "🔺" },
		door: { label: "Дверь", icon: "🚪" },
		chest: { label: "Сундук", icon: "📦" },
		player: { label: "Спавн игрока", icon: "🧍" },
		enemy: { label: "Враг", icon: "👾" }
	};

	const DEFAULT_WIDTH = 13;
	const DEFAULT_HEIGHT = 7;

	let rooms = [];
	let nextId = 1;
	let selectedRoomId = null;
	let selectedTile = "floor";

	function notify(message) {
		if (window.IsaacApp &&
			typeof window.IsaacApp.showToast === "function") {
			window.IsaacApp.showToast(message);
		}
	}

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

	function createGrid(width, height, tile = "floor") {
		return Array.from({ length: height }, function () {
			return Array.from({ length: width }, function () {
				return tile;
			});
		});
	}

	function createRoom(name = "Новая комната", width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
		width = Math.max(5, Math.min(25, Number(width) || DEFAULT_WIDTH));
		height = Math.max(5, Math.min(15, Number(height) || DEFAULT_HEIGHT));

		const room = {
			id: String(nextId++),
			name: name,
			width: width,
			height: height,
			grid: createGrid(width, height)
		};

		// Обводим комнату стенами.
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
					room.grid[y][x] = "wall";
				}
			}
		}

		// Оставляем проход в центре верхней стены.
		room.grid[0][Math.floor(width / 2)] = "door";

		rooms.push(room);
		selectedRoomId = room.id;

		return room;
	}

	function getSelectedRoom() {
		return rooms.find(room => room.id === selectedRoomId) || null;
	}

	function getCount() {
		return rooms.length;
	}

	function getRooms() {
		return rooms;
	}

	function getPage() {
		let page = document.getElementById("roomsGeneratedPage");

		if (!page) {
			page = document.createElement("section");
			page.id = "roomsGeneratedPage";
			page.className = "generated-page";
			page.hidden = true;
			document.body.appendChild(page);
		}

		return page;
	}

	function showPage() {
		const dashboard = document.getElementById("pageContent");
		const editorPage = document.getElementById("editorGeneratedPage");
		const page = getPage();

		if (dashboard) dashboard.hidden = true;
		if (editorPage) editorPage.hidden = true;

		page.hidden = false;
		return page;
	}

	function renderRoomOptions() {
		if (rooms.length === 0) {
			return `<option value="">Нет комнат</option>`;
		}

		return rooms.map(function (room) {
			return `
				<option value="${escapeHTML(room.id)}"
					${room.id === selectedRoomId ? "selected" : ""}>
					${escapeHTML(room.name)}
				</option>`;
		}).join("");
	}

	function renderPalette() {
		return Object.entries(TILE_TYPES).map(function ([key, tile]) {
			return `
				<button
					type="button"
					class="tile-palette-button ${selectedTile === key ? "active" : ""}"
					data-tile="${key}"
					aria-pressed="${selectedTile === key}">
					<span>${tile.icon}</span>
					<span>${escapeHTML(tile.label)}</span>
				</button>`;
		}).join("");
	}

	function renderGrid(room) {
		if (!room) {
			return `<p>Создай комнату, чтобы начать редактирование.</p>`;
		}

		const cells = [];

		for (let y = 0; y < room.height; y++) {
			for (let x = 0; x < room.width; x++) {
				const tileType = room.grid[y]?.[x] || "floor";
				const tile = TILE_TYPES[tileType] || TILE_TYPES.floor;

				cells.push(`
					<button
						type="button"
						class="room-cell room-tile-${escapeHTML(tileType)}"
						data-x="${x}"
						data-y="${y}"
						title="${escapeHTML(tile.label)} (${x}, ${y})"
						aria-label="${escapeHTML(tile.label)}, колонка ${x + 1}, строка ${y + 1}">
						${tile.icon}
					</button>`);
			}
		}

		return `
			<div class="room-canvas" style="
				display:grid;
				grid-template-columns:repeat(${room.width}, minmax(24px, 1fr));
				gap:2px;
				width:100%;
				max-width:900px;
				margin:12px auto;
			">
				${cells.join("")}
			</div>`;
	}

	function render() {
		const page = showPage();
		const room = getSelectedRoom();

		page.innerHTML = `
			<div class="page-heading">
				<div>
					<h1>🧱 Редактор комнат</h1>
					<p>Создавай комнаты и размещай объекты на сетке.</p>
				</div>
				<button type="button" id="addRoom">+ Комната</button>
			</div>

			<section class="panel">
				<label class="editor-field">
					<span>Выбрать комнату</span>
					<select id="roomSelector">${renderRoomOptions()}</select>
				</label>

				<div class="quick-actions">
					<button type="button" id="renameRoom" ${room ? "" : "disabled"}>Переименовать</button>
					<button type="button" id="resizeRoom" ${room ? "" : "disabled"}>Изменить размер</button>
					<button type="button" id="clearRoom" class="secondary-button" ${room ? "" : "disabled"}>Очистить комнату</button>
					<button type="button" id="deleteRoom" class="danger-button" ${room ? "" : "disabled"}>Удалить комнату</button>
				</div>
			</section>

			<section class="panel">
				<h2>Палитра объектов</h2>
				<p>Выбери объект, затем нажимай на клетки комнаты.</p>
				<div class="room-palette">${renderPalette()}</div>
				<p>Выбранный объект: <strong>${TILE_TYPES[selectedTile].icon} ${escapeHTML(TILE_TYPES[selectedTile].label)}</strong></p>
			</section>

			<section class="panel">
				<h2>${room ? escapeHTML(room.name) : "Комната не выбрана"}</h2>
				${room ? `<p>Размер: ${room.width} × ${room.height}</p>` : ""}
				<div id="roomGrid">${renderGrid(room)}</div>
			</section>

			<section class="panel">
				<h2>Информация</h2>
				<p>Комнат в проекте: <strong id="roomsCount">${rooms.length}</strong></p>
				<p>Изменения пока хранятся в памяти страницы. Сохранение и импорт будут подключены в части 6.</p>
			</section>
		`;

		bindEvents();
		updateCount();
	}

	function updateCount() {
		const count = document.getElementById("roomCount");
		if (count) count.textContent = String(rooms.length);

		const ownCount = document.getElementById("roomsCount");
		if (ownCount) ownCount.textContent = String(rooms.length);

		if (window.IsaacEditors &&
			typeof window.IsaacEditors.updateCounts === "function") {
			// Редактор предметов может обновить остальные счётчики.
			// Не вызываем его повторно, чтобы избежать цикла.
		}
	}

	function bindEvents() {
		const page = getPage();

		page.querySelector("#addRoom").addEventListener("click", function () {
			const name = `Комната ${rooms.length + 1}`;
			createRoom(name);
			render();
			notify("Комната создана!");
		});

		page.querySelector("#roomSelector").addEventListener("change", function (event) {
			selectedRoomId = event.target.value || null;
			render();
		});

		page.querySelectorAll("[data-tile]").forEach(function (button) {
			button.addEventListener("click", function () {
				selectedTile = button.dataset.tile;
				render();
			});
		});

		page.querySelectorAll("[data-x][data-y]").forEach(function (cell) {
			cell.addEventListener("click", function () {
				const room = getSelectedRoom();
				if (!room) return;

				const x = Number(cell.dataset.x);
				const y = Number(cell.dataset.y);

				if (!room.grid[y] || room.grid[y][x] === undefined) return;

				room.grid[y][x] = selectedTile;
				render();
			});
		});

		page.querySelector("#renameRoom").addEventListener("click", function () {
			const room = getSelectedRoom();
			if (!room) return;

			const name = window.prompt("Новое название комнаты:", room.name);
			if (name === null) return;

			if (!name.trim()) {
				notify("Название не может быть пустым");
				return;
			}

			room.name = name.trim();
			render();
			notify("Название комнаты изменено");
		});

		page.querySelector("#resizeRoom").addEventListener("click", function () {
			const room = getSelectedRoom();
			if (!room) return;

			const widthText = window.prompt("Ширина (5–25 клеток):", String(room.width));
			if (widthText === null) return;

			const heightText = window.prompt("Высота (5–15 клеток):", String(room.height));
			if (heightText === null) return;

			const width = Number(widthText);
			const height = Number(heightText);

			if (!Number.isInteger(width) || width < 5 || width > 25 ||
				!Number.isInteger(height) || height < 5 || height > 15) {
				notify("Допустимая ширина: 5–25, высота: 5–15");
				return;
			}

			const newGrid = createGrid(width, height);

			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					if (room.grid[y] && room.grid[y][x]) {
						newGrid[y][x] = room.grid[y][x];
					}
				}
			}

			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
						if (newGrid[y][x] === "floor") newGrid[y][x] = "wall";
					}
				}
			}

			room.width = width;
			room.height = height;
			room.grid = newGrid;

			render();
			notify("Размер комнаты изменён");
		});

		page.querySelector("#clearRoom").addEventListener("click", function () {
			const room = getSelectedRoom();
			if (!room) return;

			if (!window.confirm("Очистить все клетки этой комнаты?")) return;

			room.grid = createGrid(room.width, room.height);
			render();
			notify("Комната очищена");
		});

		page.querySelector("#deleteRoom").addEventListener("click", function () {
			const room = getSelectedRoom();
			if (!room) return;

			if (!window.confirm(`Удалить комнату «${room.name}»?`)) return;

			rooms = rooms.filter(item => item.id !== room.id);
			selectedRoomId = rooms.length ? rooms[0].id : null;

			render();
			notify("Комната удалена");
		});
	}

	function openPage() {
		if (rooms.length === 0) {
			createRoom();
		}

		render();
	}

	function setRooms(data) {
		if (!Array.isArray(data)) {
			throw new Error("Список комнат должен быть массивом");
		}

		rooms = data.map(function (room) {
			const width = Math.max(5, Math.min(25, Number(room.width) || DEFAULT_WIDTH));
			const height = Math.max(5, Math.min(15, Number(room.height) || DEFAULT_HEIGHT));
			const grid = createGrid(width, height);

			if (Array.isArray(room.grid)) {
				for (let y = 0; y < height; y++) {
					for (let x = 0; x < width; x++) {
						const tile = room.grid[y]?.[x];
						if (typeof tile === "string" && TILE_TYPES[tile]) {
							grid[y][x] = tile;
						}
					}
				}
			}

			return {
				id: String(room.id || nextId++),
				name: String(room.name || "Комната"),
				width: width,
				height: height,
				grid: grid
			};
		});

		const ids = rooms.map(room => Number(room.id)).filter(Number.isFinite);
		nextId = Math.max(nextId, 1, ...ids.map(id => id + 1));
		selectedRoomId = rooms.length ? rooms[0].id : null;
	}

	window.IsaacRooms = {
		openPage: openPage,
		create: createRoom,
		getCount: getCount,
		getRooms: getRooms,
		setRooms: setRooms
	};
})();
      
