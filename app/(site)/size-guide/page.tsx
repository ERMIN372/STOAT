import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Таблица размеров",
  description: "Размерная сетка одежды STOAT: футболки, худи, кепки, носки.",
};

export default function SizeGuidePage() {
  return (
    <div className="container max-w-3xl py-12 sm:py-16">
      <h1 className="text-display text-4xl sm:text-5xl">Таблица размеров</h1>
      <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:font-semibold prose-h2:mt-10 prose-h2:text-xl prose-table:text-sm">
        <p>
          Замеры указаны в сантиметрах. Изделия имеют свободную посадку — если
          вы между размерами, берите меньший для классического силуэта или
          больший для oversize.
        </p>

        <h2>Футболки</h2>
        <table>
          <thead>
            <tr>
              <th>Размер</th>
              <th>Обхват груди</th>
              <th>Длина изделия</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>S</td><td>104</td><td>70</td></tr>
            <tr><td>M</td><td>110</td><td>72</td></tr>
            <tr><td>L</td><td>116</td><td>74</td></tr>
            <tr><td>XL</td><td>122</td><td>76</td></tr>
          </tbody>
        </table>

        <h2>Худи</h2>
        <table>
          <thead>
            <tr>
              <th>Размер</th>
              <th>Обхват груди</th>
              <th>Длина изделия</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>S</td><td>112</td><td>67</td></tr>
            <tr><td>M</td><td>118</td><td>69</td></tr>
            <tr><td>L</td><td>124</td><td>71</td></tr>
            <tr><td>XL</td><td>130</td><td>73</td></tr>
          </tbody>
        </table>

        <h2>Кепки и носки</h2>
        <p>
          Кепки — One Size с регулируемой застёжкой (обхват головы 54–60 см).
          Носки представлены в размерах 39–42 и 43–46.
        </p>
      </div>
    </div>
  );
}
