import math


DEG = math.pi / 180
RAD = 180 / math.pi
GON_TO_DEG = 360 / 400
DEG_TO_GON = 400 / 360


def deg_to_rad(value):
    return value * DEG


def rad_to_deg(value):
    return value * RAD


def gon_to_deg(value):
    return value * GON_TO_DEG


def deg_to_gon(value):
    return value * DEG_TO_GON


def norm_gon(value):
    value = value % 400
    if value < 0:
        value += 400
    return value


def julian_day(year, month, day, hour):
    if month <= 2:
        year -= 1
        month += 12
    a = math.floor(year / 100)
    b = 2 - a + math.floor(a / 4)
    return (
        math.floor(365.25 * (year + 4716))
        + math.floor(30.6001 * (month + 1))
        + day
        + hour / 24
        + b
        - 1524.5
    )


def solar_position(year, month, day, hour_utc):
    jd = julian_day(year, month, day, hour_utc)
    t = (jd - 2451545.0) / 36525

    l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360
    m = (357.52911 + t * (35999.05029 - t * 0.0001537)) % 360
    m_rad = deg_to_rad(m)

    c = (
        (1.914602 - t * (0.004817 + t * 0.000014)) * math.sin(m_rad)
        + (0.019993 - t * 0.000101) * math.sin(2 * m_rad)
        + 0.000289 * math.sin(3 * m_rad)
    )

    sun_lon = l0 + c
    epsilon = 23.439291 - t * (0.0130042 + t * (0.00000016 - t * 0.000000504))

    sun_lon_rad = deg_to_rad(sun_lon)
    eps_rad = deg_to_rad(epsilon)
    declination = math.asin(math.sin(eps_rad) * math.sin(sun_lon_rad))

    l0_rad = deg_to_rad(l0)
    y = math.tan(eps_rad / 2)
    y2 = y * y
    eot_rad = (
        y2 * math.sin(2 * l0_rad)
        - 2 * 0.016709 * math.sin(m_rad)
        + 4 * 0.016709 * y2 * math.sin(m_rad) * math.cos(2 * l0_rad)
        - 0.5 * y2 * y2 * math.sin(4 * l0_rad)
        - 1.25 * 0.016709 * 0.016709 * math.sin(2 * m_rad)
    )

    return {
        "declination_deg": rad_to_deg(declination),
        "eot_minutes": rad_to_deg(eot_rad) * 4,
    }


def refraction_bennett(alt_deg, press_hpa=1013, temp_c=20):
    if alt_deg <= 0:
        return 0
    refraction_minutes = 1.0 / math.tan(deg_to_rad(alt_deg + 7.31 / (alt_deg + 4.4)))
    adjusted = refraction_minutes * (press_hpa / 1010) * (283 / (273 + temp_c))
    return adjusted / 60


def paralaje_solar(alt_deg):
    return (8.794 / 3600) * math.cos(deg_to_rad(alt_deg))


def acimut_solar(lat_deg, decl_deg, alt_true_deg):
    phi = deg_to_rad(lat_deg)
    delta = deg_to_rad(decl_deg)
    height = deg_to_rad(alt_true_deg)

    cos_az = (
        (math.sin(delta) - math.sin(phi) * math.sin(height))
        / (math.cos(phi) * math.cos(height))
    )
    clamped = max(-1, min(1, cos_az))
    return rad_to_deg(math.acos(clamped))


def angulo_horario(hour_utc, eot_minutes, lon_deg):
    solar_time_minutes = hour_utc * 60 + eot_minutes + lon_deg * 4
    return (solar_time_minutes / 60 - 12) * 15


def calculate_reference_azimuth(
    *,
    fecha,
    hora_utc,
    latitud,
    longitud,
    lectura_vertical_gon,
    lectura_hz_sol_gon,
    lectura_hz_ref_gon,
    tipo_vertical="cenital",
    presion_hpa=1013,
    temperatura_c=20,
):
    year_str, month_str, day_str = fecha.split("-")
    year = int(year_str)
    month = int(month_str)
    day = int(day_str)

    hour_utc_decimal = hora_utc[0] + hora_utc[1] / 60 + hora_utc[2] / 3600

    if tipo_vertical == "cenital":
        alt_obs_deg = gon_to_deg(100 - lectura_vertical_gon)
    else:
        alt_obs_deg = gon_to_deg(lectura_vertical_gon)

    solar = solar_position(year, month, day, hour_utc_decimal)
    refr = refraction_bennett(alt_obs_deg, presion_hpa, temperatura_c)
    paralaje = paralaje_solar(alt_obs_deg)
    alt_true_deg = alt_obs_deg - refr + paralaje

    az_sol_deg = acimut_solar(latitud, solar["declination_deg"], alt_true_deg)
    horario = angulo_horario(hour_utc_decimal, solar["eot_minutes"], longitud)
    if horario > 0:
        az_sol_deg = 360 - az_sol_deg

    az_sol_gon = deg_to_gon(az_sol_deg)
    delta_hz = lectura_hz_sol_gon - lectura_hz_ref_gon
    az_ref_gon = norm_gon(az_sol_gon - delta_hz)

    return {
        "azimut_sol_gon": az_sol_gon,
        "azimut_referencia_gon": az_ref_gon,
        "hemisferio_sol": "W" if horario > 0 else "E",
        "angulo_horario_deg": horario,
        "altura_observada_deg": alt_obs_deg,
        "altura_verdadera_deg": alt_true_deg,
        "declinacion_deg": solar["declination_deg"],
        "ecuacion_tiempo_min": solar["eot_minutes"],
        "correccion_refraccion_deg": refr,
        "correccion_paralaje_deg": paralaje,
        "diferencia_hz_gon": delta_hz,
    }
