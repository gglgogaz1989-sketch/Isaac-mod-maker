
/* ==================================
   ISAAC MOD MAKER — APP.JS
   Часть 3 из 7
================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const pageTitle = document.getElementById("pageTitle");
    const pageContent = document.getElementById("pageContent");
    const editorContainer = document.getElementById("editorContainer");
    const toast = document.getElementById("toast");

    const pageNames = {
        dashboard: "Главная",
        items: "Предметы",
        characters: "Персонажи",
        enemies: "Враги",
        rooms: "Комнаты",
        textures: "Текстуры",
        lua: "Lua-редактор",
        assistant: "ИИ-помощник",
        build: "Сборка мода",
        settings: "Настройки"
    };

    let toastTimeout;

    // Показывает уведомление
    function showToast(message) {
        if (!toast) return;

        toast.textContent = message;
        clearTimeout(toastTimeout);

        toastTimeout = setTimeout(() => {
            toast.textContent = "";
        }, 2800);
    }

    // Переключает активную страницу
    function openPage(page) {
        if (!pageNames[page]) {
            showToast("Неизвестный раздел");
            return;
        }

        // Главная страница встроена в index.html.
        // Остальные разделы будут реализованы редакторами.
        if (page !== "dashboard") {
            const handler = window.IsaacEditors;

            if (handler && typeof handler.openPage === "function") {
                handler.openPage(page);
            } else {
                showToast("Редактор пока не подключён");
                return;
            }
        } else {
            document.querySelectorAll(".generated-page").forEach(element => {
                element.hidden = true;
            });

            if (pageContent) {
                pageContent.hidden = false;
            }
        }

        document.querySelectorAll("[data-page]").forEach(button => {
            const active = button.dataset.page === page;

            button.classList.toggle("active", active);

            if (button.tagName === "BUTTON") {
                button.setAttribute("aria-current", active ? "page" : "false");
            }
        });

        if (pageTitle) {
            pageTitle.textContent = pageNames[page];
        }

        if (sidebar) {
            sidebar.classList.remove("open");
        }
    }

    // Навигация бокового меню и мобильной панели
    document.addEventListener("click", event => {
        const pageButton = event.target.closest("[data-page]");

        if (pageButton) {
            openPage(pageButton.dataset.page);
        }
    });

    // Открывает и закрывает боковое меню на телефоне
    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });
    }

    // Закрывает меню при нажатии за его пределами
    document.addEventListener("click", event => {
        if (!sidebar || !menuToggle) return;

        const isMobile = window.matchMedia("(max-width: 650px)").matches;

        if (
            isMobile &&
            sidebar.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {
            sidebar.classList.remove("open");
        }
    });

    // Быстрое создание объектов
    document.addEventListener("click", event => {
        const createButton = event.target.closest("[data-create]");

        if (!createButton) return;

        const type = createButton.dataset.create;
        const pageByType = {
            item: "items",
            character: "characters",
            enemy: "enemies",
            room: "rooms"
        };

        const page = pageByType[type];

        if (!page) return;

        openPage(page);

        // Просим редактор открыть чистую форму
        if (window.IsaacEditors &&
            typeof window.IsaacEditors.create === "function") {
            window.IsaacEditors.create(type);
        }
    });

    // Сохранение будет подключено в storage.js
    const saveButton = document.getElementById("saveProject");

    if (saveButton) {
        saveButton.addEventListener("click", () => {
            if (window.IsaacStorage &&
                typeof window.IsaacStorage.save === "function") {
                window.IsaacStorage.save();
                showToast("Проект сохранён!");
            } else {
                showToast("Сначала подключи storage.js");
            }
        });
    }

    // Отображение названия проекта
    function updateProjectName(name) {
        const label = document.getElementById("projectName");

        if (label && name) {
            label.textContent = name;
        }
    }

    // Публичный интерфейс приложения
    window.IsaacApp = {
        openPage,
        showToast,
        updateProjectName
    };

    // Запуск
    openPage("dashboard");

    console.log("Isaac Mod Maker запущен!");
});
          
