from datetime import datetime

holidays = {
    "01-01": "Новый год",
    "07-01": "Рождество Христово",
    "23-02": "День защитника Отечества",
    "08-03": "Международный женский день",
    "01-05": "Праздник Весны и Труда",
    "09-05": "День Победы",
    "12-06": "День России",
    "04-11": "День народного единства"
}

today = datetime.now()

date_str = today.strftime("%d-%m")

weekdays_ru = {
    0: "Понедельник",
    1: "Вторник",
    2: "Среда",
    3: "Четверг",
    4: "Пятница",
    5: "Суббота",
    6: "Воскресенье"
}

print(f"Сегодня: {today.strftime('%d.%m.%Y')}<br>")
print(f"День недели: {weekdays_ru[today.weekday()]}<br>")

if date_str in holidays:
    print(f"Сегодня праздник: {holidays[date_str]}")
else:
    print("Сегодня не праздник")
