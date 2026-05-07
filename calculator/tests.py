import unittest
from pkg.calculator import Calculator

class TestCalculator(unittest.TestCase):
    def setUp(self):
        self.calc = Calculator(0)

    def test_add(self):
        # This will fail
        self.calc.add(10)
        self.assertEqual(self.calc.current_val, 10)

    def test_subtract(self):
        self.calc.add(20) # Will fail here first
        self.calc.subtract(5)
        self.assertEqual(self.calc.current_val, 15)

    def test_multiply(self):
        self.calc.multiply(10)
        self.assertEqual(self.calc.current_val, 0)

if __name__ == "__main__":
    unittest.main()
