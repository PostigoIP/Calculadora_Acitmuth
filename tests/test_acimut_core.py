import unittest

from acimut_core import calculate_reference_azimuth, norm_gon


class AcimutCoreTests(unittest.TestCase):
    def test_norm_gon_wraps_values(self):
        self.assertEqual(norm_gon(-10), 390)
        self.assertEqual(norm_gon(410), 10)
        self.assertEqual(norm_gon(800), 0)

    def test_calculate_reference_azimuth_matches_reference_case(self):
        result = calculate_reference_azimuth(
            fecha="2026-03-29",
            hora_utc=(10, 15, 30),
            latitud=40.4168,
            longitud=-3.7038,
            lectura_vertical_gon=55.32,
            lectura_hz_sol_gon=123.4567,
            lectura_hz_ref_gon=0.0,
        )

        self.assertAlmostEqual(result["azimut_sol_gon"], 142.2119929053, places=6)
        self.assertAlmostEqual(result["azimut_referencia_gon"], 18.7552929053, places=6)
        self.assertEqual(result["hemisferio_sol"], "E")


if __name__ == "__main__":
    unittest.main()
